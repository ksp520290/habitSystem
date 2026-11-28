/* ===== dictationSystem.js ===== */
/**
 * dictationSystem.js
 * -----------------------------------------
 * 【追加要望対応】外国語の音読用ディクテーション機能。
 * 「霧晴れの開拓日誌」から「読書記録」と並べて入れる、学習ゲームの主目的からは
 * 独立した任意機能（readingSystem.jsと同じ位置づけ。ガチャ解放条件等には関与しない）。
 *
 * 1セット = 1つの音読教材：
 *   { id, title,
 *     sentences: [{ id, text, audio: { fileId, start, end } | null }],
 *     audioFiles: [{ id, name, dataUrl }],   // フォルダ単位でまとめてアップロードした音源
 *     createdAt, updatedAt }
 *
 * 【追加要望対応（HANDOFF.md 19章）】
 *   ・画面：dictationList（一覧＋フォルダ＋ZIPバックアップ）／dictationDetail（編集）／
 *     dictationListen（▶ 練習する：分割文の一覧と音声）／dictationPractice（ディクテーション）
 *   ・コイン報酬：練習する（分割前の音声を最後まで再生）5個、ディクテーション（最後まで解答）5個、
 *     全問正解20個。いずれも「編集画面に戻る」を押したときに付与（同じ教材・同じ種類は1日1回まで）。
 *
 * 【仕様に明記が無く判断した点（要レビュー。HANDOFF.md参照）】
 *   - 「自動でテキストを参照して音声を分割」は、音声認識・音素解析を伴う本格的な
 *     自動分割はブラウザ内の範囲を超えるため、「1つの音源ファイルの総再生時間を、
 *     各文の文字数の比率で按分する」という簡易的な仮分割（ヒューリスティック）とした。
 *     結果はあくまで「たたき台」であり、その後の「手動での音声カットと対応」で
 *     利用者が実際の音声を聞きながら開始・終了位置を修正する運用を想定している。
 *   - 音源はdataURL（Base64）としてIndexedDBに保存する（assetManager.jsの画像保存と
 *     同じ方式）。音声ファイルは画像より容量が大きくなりやすいため、大量・長時間の
 *     音源を扱う場合はバックアップJSONの肥大化に注意（HANDOFF.mdに記載）。
 */

const DictationSystem = (() => {

  // 【追加要望対応】コイン報酬（仕様に金額の指定があるもの）。
  const REWARD_LISTEN = 5;             // 「練習する」で分割前の音声を最後まで再生
  const REWARD_DICTATION = 5;          // 「ディクテーション」を最後の問題まで解いた
  const REWARD_DICTATION_PERFECT = 20; // 上記のうち全問正解
  // 仕様に明記が無く判断した点：コインの無限取得（同じ教材の周回）を防ぐため、
  // 「同じ教材・同じ種類の報酬は1日に1回まで」とした。falseにすると毎回受け取れる。
  const REWARD_ONCE_PER_DAY = true;

  function getAll() {
    return GameState.getState().dictationSets || [];
  }

  /**
   * 報酬を受け取る。kind: "listen" | "dictation"。
   * 同じ日に同じ種類を受け取り済みの場合は、差額だけ付与（例：5個受取済み→全問正解で+15個）。
   * @returns {number} 実際に付与したコイン数（0なら受取済み）
   */
  function claimReward(setId, kind, amount) {
    const today = Utils.todayStr();
    let granted = amount;
    GameState.update((state) => {
      if (!state.dictationRewards) state.dictationRewards = {};
      if (!state.dictationRewards[setId]) state.dictationRewards[setId] = {};
      const rec = state.dictationRewards[setId][kind];
      if (REWARD_ONCE_PER_DAY && rec && rec.date === today) granted = Math.max(0, amount - rec.amount);
      if (granted > 0) {
        const prev = (rec && rec.date === today) ? rec.amount : 0;
        state.dictationRewards[setId][kind] = { date: today, amount: prev + granted };
      }
    });
    if (granted > 0) RewardSystem.grantCompass(granted);
    return granted;
  }

  /** 教材内の音源のうち、分割前の「元の音声」とみなすもの（文に最も多く割り当てられている音源、無ければ先頭） */
  function getOriginalAudioFile(set) {
    if (!set || !set.audioFiles || set.audioFiles.length === 0) return null;
    const counts = new Map();
    (set.sentences || []).forEach((sent) => {
      if (sent.audio) counts.set(sent.audio.fileId, (counts.get(sent.audio.fileId) || 0) + 1);
    });
    let bestId = null;
    let best = 0;
    counts.forEach((n, id) => { if (n > best) { best = n; bestId = id; } });
    return set.audioFiles.find((f) => f.id === bestId) || set.audioFiles[0];
  }

  /** ディクテーション用の音源が再生されたらstage.m4aを止める（探索画面に戻るまで） */
  function watchAudio(audioEl) {
    audioEl.addEventListener("play", () => {
      Bgm.hold(audioEl);
    });
    return audioEl;
  }

  /**
   * 1つの<audio>で「音源全体」や「文ごとの範囲」を再生するプレーヤー。
   * 終了位置の監視は約40msごとに行い、範囲を大きくはみ出さないようにする。
   */
  function createPlayer(audioEl) {
    let timer = null;
    let seq = 0;

    function clearTimer() { if (timer) { clearInterval(timer); timer = null; } }

    function ensureFile(file) {
      if (audioEl.dataset.fileId === file.id && audioEl.readyState >= 1) return Promise.resolve();
      return new Promise((resolve, reject) => {
        audioEl.dataset.fileId = file.id;
        const done = () => { audioEl.removeEventListener("loadedmetadata", onOk); audioEl.removeEventListener("error", onErr); };
        const onOk = () => { done(); resolve(); };
        const onErr = () => { done(); reject(new Error("音声を読み込めませんでした")); };
        audioEl.addEventListener("loadedmetadata", onOk);
        audioEl.addEventListener("error", onErr);
        audioEl.src = file.dataUrl;
      });
    }

    /** end が null なら最後まで再生する */
    async function playRange(file, start, end, onEnd) {
      const mySeq = ++seq;
      clearTimer();
      audioEl.pause();
      try {
        await ensureFile(file);
        if (mySeq !== seq) return;
        audioEl.currentTime = start || 0;
        await audioEl.play();
      } catch (err) {
        console.error("[dictationSystem] 音声の再生に失敗しました", err);
        Utils.showToast("音声を再生できませんでした", "error");
        return;
      }
      if (mySeq !== seq || end == null) return;
      timer = setInterval(() => {
        if (audioEl.currentTime >= end || audioEl.ended) {
          clearTimer();
          audioEl.pause();
          if (onEnd) onEnd();
        }
      }, 40);
    }

    function stop() { seq += 1; clearTimer(); audioEl.pause(); }

    return { playRange, stop };
  }

  function getById(id) {
    return getAll().find((s) => s.id === id) || null;
  }

  function createSet(title) {
    const id = Utils.generateId("dictset");
    GameState.update((state) => {
      if (!state.dictationSets) state.dictationSets = [];
      state.dictationSets.push({
        id,
        title: (title || "").trim().slice(0, 100) || "無題の教材",
        sentences: [],
        audioFiles: [],
        folderId: null,
        createdAt: Utils.todayStr(),
        updatedAt: Utils.todayStr(),
      });
    });
    return id;
  }

  function updateSet(id, patch) {
    GameState.update((state) => {
      const s = state.dictationSets.find((x) => x.id === id);
      if (!s) return;
      Object.assign(s, patch);
      s.updatedAt = Utils.todayStr();
    });
  }

  function deleteSet(id) {
    GameState.update((state) => {
      state.dictationSets = state.dictationSets.filter((s) => s.id !== id);
    });
  }

  /**
   * テキストを文単位に分割する（。！？.!? および改行を区切りとする簡易分割）。
   * 既存のsentencesがある場合は呼び出し側で確認（上書き注意）を行うこと。
   */
  function splitTextToSentences(text) {
    const normalized = text.replace(/\r\n/g, "\n").trim();
    if (!normalized) return [];
    const rough = normalized.split(/\n+/).flatMap((line) =>
      line.split(/(?<=[。！？.!?])/).map((s) => s.trim()).filter(Boolean)
    );
    return rough.filter(Boolean);
  }

  function setSentencesFromText(setId, text) {
    const sentences = splitTextToSentences(text).map((t) => ({
      id: Utils.generateId("sent"), text: t, audio: null,
    }));
    updateSet(setId, { sentences });
    return sentences.length;
  }

  function addAudioFiles(setId, files) {
    return Promise.all(files.map((file) => new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ id: Utils.generateId("audio"), name: file.name, dataUrl: reader.result });
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    }))).then((results) => {
      const valid = results.filter(Boolean);
      GameState.update((state) => {
        const s = state.dictationSets.find((x) => x.id === setId);
        if (!s) return;
        s.audioFiles.push(...valid);
        s.updatedAt = Utils.todayStr();
      });
      return valid.length;
    });
  }

  function round2(n) { return Math.round(n * 100) / 100; }

  function setSentenceAudio(setId, sentenceId, fileId, start, end) {
    GameState.update((state) => {
      const s = state.dictationSets.find((x) => x.id === setId);
      const sent = s?.sentences.find((x) => x.id === sentenceId);
      if (sent) sent.audio = { fileId, start: round2(start), end: round2(end) };
      if (s) s.updatedAt = Utils.todayStr();
    });
  }

  /* ============================================================
     ZIPバックアップ（音源・分割情報・フォルダをまとめて保存／復元）
     ============================================================ */

  const BACKUP_FORMAT = "gakushu-dictation-backup";

  function mimeOfDataUrl(dataUrl) {
    const m = /^data:([^;,]+)/.exec(dataUrl || "");
    return m ? m[1] : "application/octet-stream";
  }

  function extOfName(name, mime) {
    const m = /\.([A-Za-z0-9]{1,5})$/.exec(name || "");
    if (m) return "." + m[1].toLowerCase();
    if (mime === "audio/mpeg") return ".mp3";
    if (mime === "audio/mp4" || mime === "audio/x-m4a") return ".m4a";
    return ".bin";
  }

  async function dataUrlToBytes(dataUrl) {
    try {
      const res = await fetch(dataUrl);
      return new Uint8Array(await res.arrayBuffer());
    } catch (err) {
      // fetchでdata URLを扱えない環境向けのフォールバック
      const base64 = (dataUrl || "").split(",")[1] || "";
      const bin = atob(base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return bytes;
    }
  }

  function bytesToDataUrl(bytes, mime) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("音源の変換に失敗しました"));
      reader.readAsDataURL(new Blob([bytes], { type: mime || "application/octet-stream" }));
    });
  }

  function downloadBlob(filename, blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /** すべての教材（音源・文の分割位置・フォルダ）をZIPで書き出す */
  async function exportBackupZip() {
    const sets = getAll();
    if (sets.length === 0) { Utils.showToast("書き出す教材がありません", "error"); return; }
    try {
      const entries = [];
      const manifestSets = [];
      for (const set of sets) {
        const audioMeta = [];
        for (const f of set.audioFiles || []) {
          const bytes = await dataUrlToBytes(f.dataUrl);
          const mime = mimeOfDataUrl(f.dataUrl);
          const path = `audio/${set.id}/${f.id}${extOfName(f.name, mime)}`;
          entries.push({ name: path, data: bytes });
          audioMeta.push({ id: f.id, name: f.name, mime, path });
        }
        manifestSets.push({
          id: set.id, title: set.title, folderId: set.folderId || null,
          sentences: set.sentences || [], audioFiles: audioMeta,
          createdAt: set.createdAt, updatedAt: set.updatedAt,
        });
      }
      const manifest = {
        format: BACKUP_FORMAT, version: 1, exportedAt: new Date().toISOString(),
        folders: GameState.getState().dictationFolders || [],
        sets: manifestSets,
      };
      entries.unshift({ name: "manifest.json", data: JSON.stringify(manifest, null, 2) });
      downloadBlob(`dictation_backup_${Utils.todayStr()}.zip`, ZipUtil.create(entries));
      Utils.showToast(`${sets.length}件の教材をZIPで書き出しました`, "success");
    } catch (err) {
      console.error("[dictationSystem] ZIPの書き出しに失敗しました", err);
      Utils.showToast("ZIPの書き出しに失敗しました: " + err.message, "error");
    }
  }

  /**
   * ZIPバックアップを読み込む。同じIDの教材は上書き、無いIDの教材は追加（他の教材は消えない）。
   * @returns {Promise<boolean>} 読み込みを実行したか（キャンセル・失敗はfalse）
   */
  async function importBackupZip(file) {
    try {
      const files = await ZipUtil.read(await file.arrayBuffer());
      const manifestBytes = files.get("manifest.json");
      if (!manifestBytes) throw new Error("manifest.json が見つかりません（このアプリで書き出したZIPではありません）");
      let manifest;
      try { manifest = JSON.parse(ZipUtil.textOf(manifestBytes)); }
      catch (e) { throw new Error("manifest.json の形式が正しくありません"); }
      if (manifest.format !== BACKUP_FORMAT || !Array.isArray(manifest.sets)) {
        throw new Error("音読ディクテーションのバックアップではありません");
      }

      const existingIds = new Set(getAll().map((x) => x.id));
      const overwriteCount = manifest.sets.filter((x) => existingIds.has(x.id)).length;
      if (overwriteCount > 0 && !(await uiConfirm(`同じ教材が${overwriteCount}件あります。ZIPの内容で上書きします。よろしいですか？`,'上書き'))) return false;

      const rebuilt = [];
      let missingAudio = 0;
      for (const m of manifest.sets) {
        if (!m || typeof m.id !== "string" || !Array.isArray(m.sentences)) throw new Error("教材データの形式が正しくありません");
        const audioFiles = [];
        for (const a of m.audioFiles || []) {
          const bytes = files.get(a.path);
          if (!bytes) { missingAudio += 1; continue; }
          audioFiles.push({ id: a.id, name: a.name, dataUrl: await bytesToDataUrl(bytes, a.mime) });
        }
        rebuilt.push({
          id: m.id, title: String(m.title || "無題の教材"), folderId: m.folderId || null,
          sentences: m.sentences, audioFiles,
          createdAt: m.createdAt || Utils.todayStr(), updatedAt: Utils.todayStr(),
        });
      }

      GameState.update((state) => {
        if (!state.dictationSets) state.dictationSets = [];
        if (!state.dictationFolders) state.dictationFolders = [];
        (Array.isArray(manifest.folders) ? manifest.folders : []).forEach((f) => {
          if (f && f.id && !state.dictationFolders.some((x) => x.id === f.id)) {
            state.dictationFolders.push({ id: f.id, name: String(f.name || "フォルダ"), open: f.open !== false });
          }
        });
        rebuilt.forEach((set) => {
          if (set.folderId && !state.dictationFolders.some((f) => f.id === set.folderId)) set.folderId = null;
          const idx = state.dictationSets.findIndex((x) => x.id === set.id);
          if (idx >= 0) state.dictationSets[idx] = set; else state.dictationSets.push(set);
        });
      });
      await GameState.persist();
      Utils.showToast(`${rebuilt.length}件の教材を読み込みました` + (missingAudio ? `（音源${missingAudio}件はZIP内に見つかりませんでした）` : ""), missingAudio ? "info" : "success");
      return true;
    } catch (err) {
      console.error("[dictationSystem] ZIPの読み込みに失敗しました", err);
      Utils.showToast("ZIPの読み込みに失敗しました: " + err.message, "error");
      return false;
    }
  }

  /* ============================================================
     画面："dictationList"
     ============================================================ */

  function renderListScreen(root) {
    const wrap = Utils.el("div", { class: "screen-inner" });
    wrap.appendChild(Utils.el("h2", {}, "音読ディクテーション"));
    wrap.appendChild(Utils.el("p", { class: "explore-desc" }, "外国語の音読用テキストと音源を登録し、一文ずつのディクテーション練習ができます（任意機能）。"));

    const listBox = Utils.el("div", { class: "folder-list-box" });
    const refresh = () => {
      FolderList.render(listBox, {
        foldersKey: "dictationFolders",
        itemsKey: "dictationSets",
        items: getAll(),
        emptyMessage: "まだ教材がありません。",
        onChange: refresh,
        renderItem: (s) => Utils.el("button", { class: "panel book-list-row", onclick: () => Router.navigate("dictationDetail", { setId: s.id }) }, [
          Utils.el("h3", {}, s.title),
          Utils.el("p", {}, `文の数: ${s.sentences.length} ／ 音源ファイル数: ${s.audioFiles.length}`),
        ]),
      });
    };

    wrap.appendChild(FolderList.createAddFolderButton("dictationFolders", refresh));
    wrap.appendChild(Utils.el("button", {
      class: "btn btn-primary btn-block folder-add-item-btn",
      onclick: () => openMaterialPopup(null),
    }, "＋ 新しい教材を追加"));
    wrap.appendChild(listBox);
    refresh();

    // --- ZIPバックアップ ---
    const zipPanel = Utils.el("div", { class: "panel", style: "margin-top:20px;" }, [
      Utils.el("h3", {}, "ZIPバックアップ（音声つき）"),
      Utils.el("p", { class: "explore-desc" }, "教材・音源ファイル・分割した音声の位置・フォルダをまとめて保存／復元できます。読み込むと、同じ教材は上書き、新しい教材は追加されます。"),
    ]);
    zipPanel.appendChild(Utils.el("button", { class: "btn btn-secondary btn-block", onclick: () => exportBackupZip() }, "ZIPで出力する"));
    const zipInput = Utils.el("input", { type: "file", accept: ".zip,application/zip", style: "margin-top:10px; width:100%;" });
    zipInput.addEventListener("change", async () => {
      const f = zipInput.files[0];
      if (!f) return;
      const done = await importBackupZip(f);
      zipInput.value = "";
      if (done) Router.navigate("dictationList");
    });
    zipPanel.appendChild(Utils.el("label", { class: "diary-field-label", style: "margin-top:10px;" }, "ZIPを読み込む"));
    zipPanel.appendChild(zipInput);
    wrap.appendChild(zipPanel);

    root.appendChild(wrap);
  }

  /* ============================================================
     画面："dictationDetail"（編集）
     ============================================================ */

  /* ============================================================
     教材の「追加／編集」ポップアップ（教材名・音読用テキスト・音源のアップロードを1画面で）
     set が null なら新規追加、教材を渡すと編集。
     ============================================================ */
  function rebuildSentences(setId, text) {
    const cur = getById(setId);
    if (!cur) return;
    const pool = (cur.sentences || []).slice();
    // 文面が同じ文は、これまでの音声位置をそのまま引き継ぐ
    const sentences = splitTextToSentences(text).map((t) => {
      const k = pool.findIndex((x) => x.text === t);
      if (k >= 0) return pool.splice(k, 1)[0];
      return { id: Utils.generateId("sent"), text: t, audio: null };
    });
    updateSet(setId, { sentences });
  }

  function openMaterialPopup(set) {
    const old = document.getElementById("dpop");
    if (old) old.remove();
    const isNew = !set;
    const ov = Utils.el("div", { id: "dpop", class: "dpop" });
    const box = Utils.el("div", { class: "dpop-box" });
    ov.appendChild(box);
    ov.addEventListener("click", (e) => { if (e.target === ov) ov.remove(); });

    box.appendChild(Utils.el("h3", { style: "margin:0 0 4px;" }, isNew ? "新しい教材を追加" : "教材の編集"));

    const titleInput = Utils.el("input", { type: "text", placeholder: "教材名", maxlength: "100" });
    titleInput.value = set ? set.title : "";
    box.appendChild(Utils.el("label", {}, "教材名"));
    box.appendChild(titleInput);

    const textarea = Utils.el("textarea", { rows: "7", placeholder: "音読するテキストを貼り付け（またはファイルを読み込み）" });
    textarea.value = set ? set.sentences.map((x) => x.text).join("\n") : "";
    const textFile = Utils.el("input", { type: "file", accept: ".txt,text/plain" });
    textFile.addEventListener("change", () => {
      const file = textFile.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => { textarea.value = reader.result; };
      reader.readAsText(file, "utf-8");
    });
    box.appendChild(Utils.el("label", {}, "音読用テキスト（一文ごとに自動で分けて登録されます）"));
    box.appendChild(textFile);
    box.appendChild(textarea);

    box.appendChild(Utils.el("label", {}, "音源のアップロード"));
    box.appendChild(Utils.el("p", { class: "explore-desc", style: "margin:0 0 4px;" }, "フォルダごと、または複数ファイルをまとめて選択できます。"));
    if (set && set.audioFiles.length) {
      box.appendChild(Utils.el("p", { class: "explore-desc", style: "margin:0 0 4px;" }, "登録済み：" + set.audioFiles.map((f) => f.name).join("、")));
    }
    let picked = [];
    const pickedBox = Utils.el("p", { class: "explore-desc" }, "");
    const showPicked = () => { pickedBox.textContent = picked.length ? "追加する音源：" + picked.map((f) => f.name).join("、") : ""; };
    const watchPick = (inp) => inp.addEventListener("change", () => {
      picked = picked.concat(Array.from(inp.files || []));
      inp.value = "";
      showPicked();
    });
    const dirInput = Utils.el("input", { type: "file", accept: "audio/*", multiple: "true", webkitdirectory: "true" });
    const fileInput = Utils.el("input", { type: "file", accept: "audio/*", multiple: "true" });
    watchPick(dirInput); watchPick(fileInput);
    box.appendChild(Utils.el("label", {}, "フォルダを選択"));
    box.appendChild(dirInput);
    box.appendChild(Utils.el("label", {}, "または複数ファイルを選択"));
    box.appendChild(fileInput);
    box.appendChild(pickedBox);

    const saveBtn = Utils.el("button", {
      class: "btn",
      onclick: async () => {
        saveBtn.disabled = true;
        let id;
        if (isNew) id = createSet(titleInput.value);
        else { id = set.id; updateSet(id, { title: titleInput.value.trim().slice(0, 100) || "無題の教材" }); }
        rebuildSentences(id, textarea.value);
        if (picked.length) {
          const n = await addAudioFiles(id, picked);
          Utils.showToast(`${n}件の音源を追加しました`, "success");
        }
        ov.remove();
        Router.navigate("dictationDetail", { setId: id });
      },
    }, isNew ? "追加" : "保存");
    box.appendChild(Utils.el("div", { class: "dpop-btns" }, [
      Utils.el("button", { class: "btn g", onclick: () => ov.remove() }, "キャンセル"),
      saveBtn,
    ]));
    document.body.appendChild(ov);
    titleInput.focus();
  }

  /* ============================================================
     画面："dictationDetail"（教材の編集：音声カット・区間再生）
     ・音声プレーヤーを画面上部に固定し、すぐ横に「✂ カット」ボタンを置く
     ・文章は「音読」画面のような一覧。タップで選択／長押しで文章を直接編集
     ・各文の下に「この範囲で試しに再生」と、その右横に「今の位置で終了」
     ・カット（連続確定）
         通常：再生中に押すたび、一番上の文から順に「終了位置」を確定（開始＝前の文の終了）
         選択中：選んだ文の1つ前の終了位置から再生を始め、選んだ文から上→下へ順に確定
     ============================================================ */
  function renderDetailScreen(root, params = {}) {
    const set = getById(params.setId);
    if (!set) { root.appendChild(Utils.el("p", { class: "empty-state" }, "教材が見つかりません")); return; }

    const wrap = Utils.el("div", { class: "screen-inner dedit" });
    const files = set.audioFiles || [];
    const orig = getOriginalAudioFile(set);
    let fileId = orig ? orig.id : null;          // いま鳴らしている音源（カットの対象）
    let sel = null;                              // タップで選択中の文の番号
    let cursor = 0;                              // 次に「終了」を確定する文の番号
    let playIdx = -1, timer = null;
    const rows = [];                             // { sent, el, textEl, timeEl, selEl }

    const fmtT = (s) => (Math.round(s * 100) / 100).toFixed(2) + "秒";
    const list = () => set.sentences;
    const curFile = () => files.find((f) => f.id === fileId) || null;

    // ---------- 固定プレーヤー ----------
    const audioEl = watchAudio(Utils.el("audio", { controls: "true", preload: "auto" }));
    const status = Utils.el("div", { class: "dedit-status" }, "");
    const fileSel = files.length > 1
      ? Utils.el("select", { class: "dedit-file", onchange: () => { fileId = fileSel.value; stopRange(); loadFile(curFile()); } },
          files.map((f) => Utils.el("option", { value: f.id }, f.name)))
      : null;
    if (fileSel && fileId) fileSel.value = fileId;
    const cutBtn = Utils.el("button", { class: "btn dedit-cut", onclick: () => onCut() }, "✂ カット");
    wrap.appendChild(Utils.el("div", { class: "dedit-player" }, [
      Utils.el("div", { class: "dedit-prow" }, [audioEl, cutBtn]),
      fileSel,
      status,
    ]));

    function stopRange() { if (timer) { clearInterval(timer); timer = null; } playIdx = -1; markUI(); }
    function loadFile(f, cb) {
      if (!f) return;
      if (audioEl.dataset.fid === f.id) { if (cb) cb(); return; }
      audioEl.dataset.fid = f.id;
      const ok = () => { audioEl.removeEventListener("loadedmetadata", ok); if (cb) cb(); };
      audioEl.addEventListener("loadedmetadata", ok);
      audioEl.src = f.dataUrl;
    }
    if (curFile()) loadFile(curFile());

    function setStatus() {
      if (!files.length) { status.textContent = "先に音源をアップロードしてください（右上の⚙️から）"; return; }
      if (!list().length) { status.textContent = "文章がありません。教材名をタップして音読用テキストを入力してください"; return; }
      if (sel !== null) status.textContent = `${sel + 1}番目を選択中：「カット」で、その1つ前の終了位置から再生を始めます`;
      else if (cursor >= list().length) status.textContent = "最後の文まで確定しました。直したい文は、タップして「カット」か「今の位置で終了」で再調整できます";
      else status.textContent = `再生しながら「カット」→ ${cursor + 1}番目の文の終了位置を確定します`;
    }

    // ---------- 終了位置の確定（開始は、前の文の終了につなぐ） ----------
    function applyEnd(i, t) {
      const f = curFile();
      if (!f) { Utils.showToast("音源が登録されていません", "error"); return false; }
      const L = list(), s = L[i], prev = i > 0 ? L[i - 1] : null;
      const start = i === 0 ? 0 : (prev && prev.audio && prev.audio.fileId === f.id ? prev.audio.end : (s.audio && s.audio.fileId === f.id ? s.audio.start : 0));
      const end = round2(t);
      if (end <= start + 0.05) { Utils.showToast("前の文の終了より後の位置で押してください", "error"); return false; }
      GameState.update(() => {
        s.audio = { fileId: f.id, start: round2(start), end };
        const nx = L[i + 1];
        if (nx && nx.audio && nx.audio.fileId === f.id) nx.audio = Object.assign({}, nx.audio, { start: end });   // 次の文の開始は、この文の終了につなぐ
        set.updatedAt = Utils.todayStr();
      });
      refreshRow(i);
      if (L[i + 1]) refreshRow(i + 1);
      return true;
    }

    function onCut() {
      const L = list();
      if (!curFile()) { Utils.showToast("音源が登録されていません", "error"); return; }
      if (!L.length) { Utils.showToast("文章がありません", "error"); return; }
      if (sel !== null) {   // 選択中：1つ前の文の終了位置から再生し、選んだ文から順に確定していく
        cursor = sel; sel = null;
        const prev = cursor > 0 ? L[cursor - 1] : null;
        const st = cursor === 0 ? 0 : (prev && prev.audio ? prev.audio.end : 0);
        stopRange();
        loadFile(curFile(), () => { audioEl.currentTime = st; audioEl.play(); });
        markUI();
        return;
      }
      if (audioEl.paused) { Utils.showToast("音声を再生しながら「カット」を押してください", "info"); return; }
      if (cursor >= L.length) { Utils.showToast("最後の文まで確定しました", "info"); return; }
      if (applyEnd(cursor, audioEl.currentTime)) {
        cursor += 1;
        markUI();
        const nr = rows[cursor];
        if (nr && nr.el.scrollIntoView) nr.el.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }

    // ---------- 範囲の試し再生 ----------
    function playRange(i) {
      const s = list()[i];
      if (!s || !s.audio) { Utils.showToast("この文は終了位置が未設定です", "error"); return; }
      const f = files.find((x) => x.id === s.audio.fileId);
      if (!f) { Utils.showToast("音源が見つかりません", "error"); return; }
      stopRange();
      playIdx = i; markUI();
      loadFile(f, () => {
        audioEl.currentTime = s.audio.start;
        audioEl.play();
        timer = setInterval(() => {
          if (audioEl.currentTime >= s.audio.end || audioEl.ended) { clearInterval(timer); timer = null; audioEl.pause(); playIdx = -1; markUI(); }
        }, 40);
      });
    }

    // ---------- 一覧の描画 ----------
    function timeText(s, i) {
      if (!s.audio) return { t: "未設定", bad: false };
      const bad = s.audio.end <= s.audio.start;
      return { t: `開始 ${fmtT(s.audio.start)} → 終了 ${fmtT(s.audio.end)}${bad ? "（要調整）" : ""}`, bad };
    }
    function refreshRow(i) {
      const r = rows[i], s = list()[i];
      if (!r || !s) return;
      const tt = timeText(s, i);
      r.timeEl.textContent = tt.t;
      r.timeEl.classList.toggle("bad", tt.bad);
    }
    function markUI() {
      rows.forEach((r, i) => {
        r.el.classList.toggle("is-sel", sel === i);
        r.el.classList.toggle("is-next", sel === null && cursor === i && curFile() && audioEl && !audioEl.paused);
        r.el.classList.toggle("is-playing", playIdx === i);
      });
      setStatus();
    }
    audioEl.addEventListener("play", markUI);
    audioEl.addEventListener("pause", markUI);

    function startEdit(i) {   // 長押し：その場で文章を編集
      const r = rows[i], s = list()[i];
      if (!r || !s || r.editing) return;
      r.editing = true;
      const ta = Utils.el("textarea", { rows: "4" });
      ta.value = s.text;
      const box = Utils.el("div", { class: "dedit-edit" }, [
        ta,
        Utils.el("div", { class: "dedit-ebtn" }, [
          Utils.el("button", { class: "btn btn-secondary", onclick: () => finishEdit(i, null) }, "キャンセル"),
          Utils.el("button", { class: "btn btn-secondary", onclick: () => deleteSentence(i) }, "🗑 削除"),
          Utils.el("button", { class: "btn", onclick: () => finishEdit(i, ta.value) }, "保存"),
        ]),
      ]);
      r.mainEl.style.display = "none";
      r.el.insertBefore(box, r.mainEl.nextSibling);
      r.editBox = box;
      ta.focus();
    }
    function finishEdit(i, text) {
      const r = rows[i], s = list()[i];
      if (!r || !s) return;
      if (text !== null) {
        const t = text.replace(/\s*\n\s*/g, " ").trim();
        if (!t) { Utils.showToast("文章が空です。消したい場合は「削除」を押してください", "error"); return; }
        GameState.update(() => { s.text = t; set.updatedAt = Utils.todayStr(); });
        r.textEl.textContent = t;
        Utils.showToast("文を編集しました", "success");
      }
      if (r.editBox) r.editBox.remove();
      r.editBox = null; r.editing = false; r.mainEl.style.display = "";
    }
    async function deleteSentence(i) {
      const s = list()[i];
      if (!s || !(await uiConfirm("この文を削除しますか？\n「" + s.text.slice(0, 40) + "」", "削除"))) return;
      GameState.update(() => { set.sentences = set.sentences.filter((x) => x.id !== s.id); set.updatedAt = Utils.todayStr(); });
      sel = null; if (cursor > i) cursor -= 1;
      drawList();
      Utils.showToast("文を削除しました", "success");
    }

    const listBox = Utils.el("div", { class: "dict-listen-list" });
    function drawList() {
      listBox.innerHTML = ""; rows.length = 0;
      if (!list().length) {
        listBox.appendChild(Utils.el("p", { class: "empty-state" }, "まだ一文分割されていません。教材名をタップして、音読用テキストを入力してください。"));
      }
      list().forEach((s, i) => {
        const textEl = Utils.el("span", { class: "dict-sentence-text" }, s.text);
        const timeEl = Utils.el("div", { class: "dedit-time" }, "");
        const mainEl = Utils.el("div", { class: "dedit-main" }, [Utils.el("span", { class: "dict-sentence-no" }, String(i + 1)), textEl]);
        const el = Utils.el("div", { class: "panel dedit-row" }, [
          mainEl, timeEl,
          Utils.el("div", { class: "dedit-act" }, [
            Utils.el("button", { class: "btn btn-secondary", onclick: () => playRange(i) }, "▶ この範囲で試しに再生"),
            Utils.el("button", { class: "btn btn-secondary", onclick: () => { if (!curFile()) { Utils.showToast("音源が登録されていません", "error"); return; } applyEnd(i, audioEl.currentTime); } }, "⏱ 今の位置で終了"),
          ]),
        ]);
        const r = { el, mainEl, textEl, timeEl, editing: false, editBox: null };
        rows.push(r);
        // 長押し（500ms）＝文章を直接編集／タップ＝選択（もう一度タップで解除）
        let tm = null, lp = false, sx = 0, sy = 0;
        const clr = () => { clearTimeout(tm); tm = null; };
        mainEl.addEventListener("pointerdown", (e) => { lp = false; sx = e.clientX; sy = e.clientY; clr(); tm = setTimeout(() => { lp = true; tm = null; try { navigator.vibrate(30); } catch (_) {} startEdit(i); }, 500); });
        mainEl.addEventListener("pointermove", (e) => { if (tm && Math.hypot(e.clientX - sx, e.clientY - sy) > 10) clr(); });
        ["pointerup", "pointercancel", "pointerleave"].forEach((t) => mainEl.addEventListener(t, clr));
        mainEl.addEventListener("contextmenu", (e) => e.preventDefault());
        mainEl.addEventListener("click", () => { if (lp) { lp = false; return; } if (r.editing) return; sel = sel === i ? null : i; markUI(); });
        listBox.appendChild(el);
        refreshRow(i);
      });
      markUI();
    }
    drawList();
    wrap.appendChild(listBox);

    wrap.appendChild(Utils.el("button", {
      class: "btn btn-secondary btn-block",
      onclick: async () => {
        if (await uiConfirm(`「${set.title}」を削除しますか？`, "削除")) {
          deleteSet(set.id);
          Router.navigate("dictationList");
        }
      },
    }, "この教材を削除する"));
    wrap.appendChild(Utils.el("button", { class: "btn btn-moss btn-block dict-btn-gap", onclick: () => scBack() }, "一覧に戻る"));
    root.appendChild(wrap);
    Router.onLeave(() => { stopRange(); audioEl.pause(); });

    // ---------- ヘッダー2行目：教材名（タップで編集）／音読／dictation／⚙️ ----------
    const bar2 = document.getElementById("sc2");
    if (bar2) {
      bar2.innerHTML = "";
      bar2.appendChild(Utils.el("button", { class: "dtitle", title: "タップで教材名・テキスト・音源を編集", onclick: () => openMaterialPopup(set) }, set.title + " ✎"));
      bar2.appendChild(Utils.el("button", { class: "btn btn-moss", onclick: () => Router.navigate("dictationListen", { setId: set.id }) }, "音読"));
      bar2.appendChild(Utils.el("button", { class: "btn btn-moss", onclick: () => Router.navigate("dictationPractice", { setId: set.id }) }, "dictation"));
      bar2.appendChild(Utils.el("button", { class: "btn btn-secondary", title: "教材名・音読用テキスト・音源を編集", "aria-label": "教材の設定", onclick: () => openMaterialPopup(set) }, "⚙️"));
    }
  }

  /* ============================================================
     画面："dictationListen"（▶ 練習する：分割された文を一文ずつ聞く）
     ============================================================ */

  function renderListenScreen(root, params = {}) {
    const set = getById(params.setId);
    if (!set) { root.appendChild(Utils.el("p", { class: "empty-state" }, "教材が見つかりません")); return; }

    const wrap = Utils.el("div", { class: "screen-inner" });
    wrap.appendChild(Utils.el("h2", {}, set.title));

    const audioEl = watchAudio(Utils.el("audio", { controls: "true", style: "width:100%;" }));
    const player = createPlayer(audioEl);
    const originalFile = getOriginalAudioFile(set);

    let mode = null;      // "full"（分割前の音声）| "segment"（一文ずつ）
    let listened = 0;     // 分割前の音声を実際に聞いた秒数（シークで飛ばした分は数えない）
    let lastTime = 0;
    let fullCompleted = false;
    const rewardNote = Utils.el("p", { class: "explore-desc dict-reward-note" }, "");

    audioEl.addEventListener("timeupdate", () => {
      if (mode !== "full") return;
      const d = audioEl.currentTime - lastTime;
      if (d > 0 && d < 1.5) listened += d;
      lastTime = audioEl.currentTime;
    });
    audioEl.addEventListener("ended", () => {
      if (mode !== "full") return;
      // 通しで聞いた実時間が全体の9割以上のときだけ「最後まで再生した」と扱う
      if (audioEl.duration && listened >= audioEl.duration * 0.9) {
        fullCompleted = true;
        rewardNote.textContent = `最後まで聞きました。この画面を戻る／閉じると🪙${REWARD_LISTEN}個もらえます。`;
      }
    });

    const lineButtons = [];
    function highlight(activeBtn) {
      lineButtons.forEach((b) => b.classList.toggle("is-playing", b === activeBtn));
    }

    const topBtn = Utils.el("button", {
      class: "btn btn-moss btn-block",
      onclick: () => {
        if (!originalFile) { Utils.showToast("音源が登録されていません。編集画面でアップロードしてください", "error"); return; }
        mode = "full"; listened = 0; lastTime = 0; fullCompleted = false;
        rewardNote.textContent = "";
        highlight(null);
        player.playRange(originalFile, 0, null);
      },
    }, "▶ 練習する");
    wrap.appendChild(topBtn);
    wrap.appendChild(Utils.el("p", { class: "explore-desc" }, "上のボタンで分割前の音声を最初から再生します。下の文をタップすると、その一文だけを再生します。"));
    wrap.appendChild(audioEl);
    wrap.appendChild(rewardNote);

    const listBox = Utils.el("div", { class: "dict-listen-list" });
    if (set.sentences.length === 0) {
      listBox.appendChild(Utils.el("p", { class: "empty-state" }, "まだ一文分割されていません。教材の編集で音読用テキストを入力してください。"));
    }
    set.sentences.forEach((sent, idx) => {
      const file = sent.audio ? set.audioFiles.find((f) => f.id === sent.audio.fileId) : null;
      const playable = !!(sent.audio && file);
      const btn = Utils.el("button", {
        class: "panel dict-sentence-btn" + (playable ? "" : " is-disabled"),
        disabled: !playable || undefined,
        onclick: () => {
          mode = "segment";
          highlight(btn);
          player.playRange(file, sent.audio.start, sent.audio.end, () => highlight(null));
        },
      }, [
        Utils.el("span", { class: "dict-sentence-no" }, `${idx + 1}`),
        Utils.el("span", { class: "dict-sentence-text" }, sent.text),
        playable ? null : Utils.el("span", { class: "dict-sentence-note" }, "（音声未設定）"),
      ]);
      lineButtons.push(btn);
      listBox.appendChild(btn);
    });
    wrap.appendChild(listBox);

    // 戻る／閉じる／パンくずで画面を離れるときの共通処理（音を止め、条件を満たしていれば報酬を付与）
    Router.onLeave(() => {
      player.stop();
      if (fullCompleted) {
        const granted = claimReward(set.id, "listen", REWARD_LISTEN);
        if (granted > 0) Utils.showToast(`🪙 コインを${granted}個獲得しました`, "success");
        else Utils.showToast("この教材の「音読」の報酬は、今日はすでに受け取り済みです", "info");
      }
    });
    wrap.appendChild(Utils.el("button", { class: "btn btn-moss btn-block dict-btn-gap", onclick: () => scBack() }, "編集画面に戻る"));

    root.appendChild(wrap);
  }

  /* ============================================================
     画面："dictationPractice"（ディクテーション：一文ずつ聞き取って入力）
     ============================================================ */

  function renderPracticeScreen(root, params = {}) {
    const set = getById(params.setId);
    if (!set) { root.appendChild(Utils.el("p", { class: "empty-state" }, "教材が見つかりません")); return; }
    const playable = set.sentences.filter((s) => s.audio);
    if (playable.length === 0) {
      root.appendChild(Utils.el("p", { class: "empty-state" }, "音声が対応付けられた文がありません。先に教材の編集で音声を設定してください。"));
      return;
    }

    const wrap = Utils.el("div", { class: "screen-inner" });
    wrap.appendChild(Utils.el("h2", {}, set.title));

    let index = 0;
    let showingText = false;
    // 各文の「最初の答え合わせ」の結果（全問正解の判定に使う）。答えを見てから答え合わせした文は不正解扱い。
    const results = new Map();   // sentenceId → correct(boolean)
    const peeked = new Set();    // 答え合わせ前に「答えを見る」を使った文

    const audioEl = watchAudio(Utils.el("audio", { controls: "true", style: "width:100%;" }));
    const player = createPlayer(audioEl);
    const counter = Utils.el("div", { class: "flashcard-counter" }, "");
    const progress = Utils.el("p", { class: "explore-desc dict-reward-note" }, "");
    const textBox = Utils.el("div", { class: "panel" });
    const answerInput = Utils.el("input", { type: "text", class: "review-typing-input", placeholder: "聞き取った内容を入力" });
    const judgeBox = Utils.el("div", {});

    function isAllAnswered() { return results.size >= playable.length; }
    function isAllCorrect() { return isAllAnswered() && [...results.values()].every(Boolean); }

    function updateProgress() {
      let text = `解答済み ${results.size} / ${playable.length}`;
      if (isAllAnswered()) {
        text += isAllCorrect()
          ? `　全問正解です！この画面を戻る／閉じると🪙${REWARD_DICTATION_PERFECT}個もらえます。`
          : `　最後まで解きました。この画面を戻る／閉じると🪙${REWARD_DICTATION}個もらえます。`;
      }
      progress.textContent = text;
    }

    function render() {
      const sent = playable[index];
      counter.textContent = `${index + 1} / ${playable.length}`;
      textBox.innerHTML = "";
      textBox.appendChild(Utils.el("p", {}, showingText ? sent.text : "（再生して聞き取ってください。「答えを見る」で表示）"));
      answerInput.value = "";
      judgeBox.innerHTML = "";
      updateProgress();
    }

    const playBtn = Utils.el("button", {
      class: "btn btn-moss",
      onclick: () => {
        const sent = playable[index];
        const file = set.audioFiles.find((f) => f.id === sent.audio.fileId);
        if (!file) { Utils.showToast("この文の音源が見つかりません", "error"); return; }
        player.playRange(file, sent.audio.start, sent.audio.end);
      },
    }, "▶ この文を再生");

    const checkBtn = Utils.el("button", {
      class: "btn btn-secondary",
      onclick: () => {
        const sent = playable[index];
        const isCorrect = answerInput.value.trim() === sent.text.trim();
        if (!results.has(sent.id)) results.set(sent.id, isCorrect && !peeked.has(sent.id));
        judgeBox.innerHTML = "";
        judgeBox.appendChild(Utils.el("p", {}, isCorrect ? "正解！" : `正しくは: ${sent.text}`));
        updateProgress();
      },
    }, "答え合わせ");

    const showBtn = Utils.el("button", {
      class: "btn btn-secondary",
      onclick: () => {
        const sent = playable[index];
        if (!showingText && !results.has(sent.id)) peeked.add(sent.id);
        showingText = !showingText;
        render();
      },
    }, "答えを見る");

    const navRow = Utils.el("div", { class: "quiz-choice-row" }, [
      Utils.el("button", { class: "btn btn-secondary", onclick: () => { index = (index - 1 + playable.length) % playable.length; showingText = false; render(); } }, "← 前の文"),
      Utils.el("button", { class: "btn btn-secondary", onclick: () => { index = (index + 1) % playable.length; showingText = false; render(); } }, "次の文 →"),
    ]);

    wrap.appendChild(counter);
    wrap.appendChild(progress);
    wrap.appendChild(Utils.el("p", { class: "explore-desc" }, "全問正解の判定は、各文の最初の答え合わせで決まります。答えを見てから答え合わせした文は不正解として扱われます。"));
    wrap.appendChild(audioEl);
    wrap.appendChild(Utils.el("div", { class: "quiz-choice-row" }, [playBtn, showBtn]));
    wrap.appendChild(textBox);
    wrap.appendChild(answerInput);
    wrap.appendChild(checkBtn);
    wrap.appendChild(judgeBox);
    wrap.appendChild(navRow);
    Router.onLeave(() => {
      player.stop();
      if (isAllAnswered()) {
        const amount = isAllCorrect() ? REWARD_DICTATION_PERFECT : REWARD_DICTATION;
        const granted = claimReward(set.id, "dictation", amount);
        if (granted > 0) Utils.showToast(`🪙 コインを${granted}個獲得しました`, "success");
        else Utils.showToast("この教材のディクテーション報酬は、今日はすでに受け取り済みです", "info");
      }
    });
    wrap.appendChild(Utils.el("button", { class: "btn btn-moss btn-block", style: "margin-top:16px;", onclick: () => scBack() }, "編集画面に戻る"));

    render();
    root.appendChild(wrap);
  }

  Router.registerScreen("dictationList", renderListScreen);
  Router.registerScreen("dictationDetail", renderDetailScreen);
  Router.registerScreen("dictationListen", renderListenScreen);
  Router.registerScreen("dictationPractice", renderPracticeScreen);

  return {
    getAll, getById, createSet, updateSet, deleteSet,
    splitTextToSentences, setSentencesFromText, addAudioFiles,
    setSentenceAudio,
    exportBackupZip, importBackupZip, getOriginalAudioFile,
  };
})();



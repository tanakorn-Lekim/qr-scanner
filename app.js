const API_URL = "https://script.google.com/macros/s/AKfycbxi_A2qSNq9wNz5w0vbQqGVFZECmnq912yvvUtg5pR75vx-8oAou38YFl8Zp0SYfCinhQ/exec";
const API_TOKEN = "Store_DB_SIM";

let currentMode = "";
let currentTransferTag = null;
let selectedTransferId = "";
let scanner = null;
let scanLocked = false;
let lastScanText = "";

function apiCall(action, params = {}) {
  return new Promise((resolve, reject) => {
    if (!API_URL || API_URL.indexOf("PASTE_") === 0) {
      reject(new Error("กรุณาตั้งค่า API_URL ใน app.js"));
      return;
    }

    const callbackName =
      "storeApiCallback_" +
      Date.now() +
      "_" +
      Math.floor(Math.random() * 100000);

    const query =
      new URLSearchParams({
        action,
        token: API_TOKEN,
        callback: callbackName,
        ...params
      });

    const script =
      document.createElement("script");

    window[callbackName] = function(data) {
      delete window[callbackName];
      script.remove();
      resolve(data);
    };

    script.onerror = function() {
      delete window[callbackName];
      script.remove();
      reject(new Error("เรียก Apps Script API ไม่สำเร็จ"));
    };

    script.src =
      API_URL + "?" + query.toString();

    document.body.appendChild(script);
  });
}

function showMessage(text, type = "ok") {
  const box =
    document.getElementById("messageBox");

  box.className =
    "message " + type;

  box.innerText =
    text;

  box.classList.remove("hidden");

  setTimeout(() => {
    box.classList.add("hidden");
  }, 3500);
}

function showPage(pageId) {
  document
    .querySelectorAll(".page")
    .forEach(page => page.classList.remove("active"));

  document
    .getElementById(pageId)
    .classList
    .add("active");
}

function openTransfer() {
  currentMode = "TRANSFER";
  stopScanner();
  showPage("transferPage");
}

function openReceive() {
  currentMode = "RECEIVE";
  stopScanner();
  showPage("receivePage");
}

function backToMenu() {
  currentMode = "";
  stopScanner();
  showPage("mainMenu");
}

function startScanner() {
  const readerId =
    currentMode === "RECEIVE"
      ? "receiveReader"
      : "reader";

  const cameraStatus =
    currentMode === "RECEIVE"
      ? document.getElementById("receiveCameraStatus")
      : document.getElementById("cameraStatus");

  const cameraBtn =
    currentMode === "RECEIVE"
      ? document.getElementById("receiveCameraBtn")
      : document.getElementById("cameraBtn");

  if (!currentMode) {
    showMessage("กรุณาเลือก TRANSFER หรือ RECEIVE ก่อนเปิดกล้อง", "error");
    return;
  }

  if (scanner) {
    cameraStatus.innerText = "กล้องพร้อมใช้งานแล้ว";
    return;
  }

  scanner =
    new Html5Qrcode(readerId);

  cameraStatus.innerText =
    "กำลังเปิดกล้อง...";

  Html5Qrcode.getCameras()
    .then(devices => {
      if (!devices || devices.length === 0) {
        throw new Error("ไม่พบกล้อง");
      }

      return scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: 200
        },
        onScanSuccess,
        () => {}
      );
    })
    .then(() => {
      cameraStatus.innerText = "กล้องพร้อมใช้งานแล้ว";
      cameraBtn.disabled = true;
    })
    .catch(err => {
      scanner = null;
      cameraStatus.innerText = "เปิดกล้องไม่ได้: " + err;
      showMessage("เปิดกล้องไม่ได้: " + err, "error");
    });
}

function stopScanner() {
  const activeScanner =
    scanner;

  scanner =
    null;

  const transferBtn =
    document.getElementById("cameraBtn");

  const receiveBtn =
    document.getElementById("receiveCameraBtn");

  if (transferBtn) transferBtn.disabled = false;
  if (receiveBtn) receiveBtn.disabled = false;

  if (!activeScanner) {
    return;
  }

  activeScanner
    .stop()
    .then(() => activeScanner.clear())
    .catch(() => {});
}

function onScanSuccess(decodedText) {
  if (scanLocked) return;

  const tagId =
    String(decodedText || "").trim();

  if (!tagId || tagId === lastScanText) return;

  scanLocked = true;
  lastScanText = tagId;

  setTimeout(() => {
    scanLocked = false;
    lastScanText = "";
  }, 2000);

  if (currentMode === "TRANSFER") {
    document.getElementById("transferTagId").value = tagId;
    scanTransfer();
    return;
  }

  if (currentMode === "RECEIVE") {
    document.getElementById("receiveTagId").value = tagId;
    scanReceive();
    return;
  }

  showMessage("เลือก TRANSFER หรือ RECEIVE ก่อนสแกน", "error");
}

function handleTransferEnter(event) {
  if (event.key === "Enter") {
    scanTransfer();
  }
}

function handleReceiveEnter(event) {
  if (event.key === "Enter") {
    scanReceive();
  }
}

function scanTransfer() {
  const tagId =
    document.getElementById("transferTagId").value.trim();

  if (!tagId) {
    showMessage("กรุณาระบุ TAG ID", "error");
    return;
  }

  apiCall("scanTransferTag", { tagId })
    .then(res => {
      if (!res.status) {
        showMessage(res.message || "Scan failed", "error");
        return;
      }

      currentTransferTag = res.tag;
      renderTransferTag(res.tag);
    })
    .catch(err => showMessage(err.message, "error"));
}

function renderTransferTag(tag) {
  document
    .getElementById("transferInfoBox")
    .classList
    .remove("hidden");

  document.getElementById("transferShowTagId").innerText = tag.tagId;
  document.getElementById("transferPart").innerText = tag.part;
  document.getElementById("transferQtyShow").innerText =
    tag.balanceQty + " / " + tag.originalQty;
  document.getElementById("transferLocation").innerText = tag.location;
  document.getElementById("transferStatus").innerText = tag.statusText;
  document.getElementById("transferQty").value = "";
  document.getElementById("transferQty").max = tag.balanceQty;
}

function confirmTransferClick() {
  if (!currentTransferTag) {
    showMessage("กรุณา scan tag ก่อน", "error");
    return;
  }

  const qty =
    Number(document.getElementById("transferQty").value) || 0;
  const to =
    document.getElementById("transferTo").value;
  const by =
    document.getElementById("transferBy").value.trim();

  if (qty <= 0) {
    showMessage("กรุณาใส่จำนวนโอน", "error");
    return;
  }

  if (qty > currentTransferTag.balanceQty) {
    showMessage("จำนวนโอนเกิน Balance = " + currentTransferTag.balanceQty, "error");
    return;
  }

  if (!by) {
    showMessage("กรุณาใส่ชื่อคนโอน", "error");
    return;
  }

  apiCall("confirmTransfer", {
    tagId: currentTransferTag.tagId,
    to,
    qty,
    by
  })
    .then(res => {
      showMessage(res.message || "", res.status ? "ok" : "error");

      if (res.status) {
        resetTransferPage();
      }
    })
    .catch(err => showMessage(err.message, "error"));
}

function resetTransferPage() {
  currentTransferTag = null;
  document.getElementById("transferTagId").value = "";
  document.getElementById("transferQty").value = "";
  document.getElementById("transferBy").value = "";
  document.getElementById("transferInfoBox").classList.add("hidden");
}

function scanReceive() {
  const tagId =
    document.getElementById("receiveTagId").value.trim();

  selectedTransferId = "";

  if (!tagId) {
    showMessage("กรุณาระบุ TAG ID", "error");
    return;
  }

  apiCall("scanReceiveTag", { tagId })
    .then(res => {
      if (!res.status) {
        showMessage(res.message || "Scan failed", "error");
        return;
      }

      renderPendingList(res.pending || []);
    })
    .catch(err => showMessage(err.message, "error"));
}

function renderPendingList(list) {
  const box =
    document.getElementById("pendingBox");
  const pendingList =
    document.getElementById("pendingList");

  box.classList.remove("hidden");
  pendingList.innerHTML = "";

  if (list.length === 0) {
    pendingList.innerHTML =
      '<div class="pending-item">ไม่พบรายการรอรับ</div>';
    return;
  }

  list.forEach((item, index) => {
    const div =
      document.createElement("div");

    div.className =
      "pending-item";

    div.innerHTML = `
      <label>
        <input
          type="radio"
          name="pendingTransfer"
          value="${escapeHtml(item.transferId)}"
          ${index === 0 ? "checked" : ""}>
        ${escapeHtml(item.from)} → ${escapeHtml(item.to)}
        | QTY ${escapeHtml(String(item.qty))}
        | BY ${escapeHtml(item.transferBy)}
      </label>
    `;

    pendingList.appendChild(div);
  });

  selectedTransferId =
    list[0].transferId;
}

document.addEventListener("change", event => {
  if (event.target.name === "pendingTransfer") {
    selectedTransferId = event.target.value;
  }
});

function confirmReceiveClick() {
  const receiveBy =
    document.getElementById("receiveBy").value.trim();

  if (!selectedTransferId) {
    showMessage("กรุณาเลือกรายการรับเข้า", "error");
    return;
  }

  if (!receiveBy) {
    showMessage("กรุณาใส่ชื่อคนรับ", "error");
    return;
  }

  apiCall("confirmReceive", {
    transferId: selectedTransferId,
    by: receiveBy
  })
    .then(res => {
      showMessage(res.message || "", res.status ? "ok" : "error");

      if (res.status) {
        resetReceivePage();
      }
    })
    .catch(err => showMessage(err.message, "error"));
}

function resetReceivePage() {
  selectedTransferId = "";
  document.getElementById("receiveTagId").value = "";
  document.getElementById("receiveBy").value = "";
  document.getElementById("pendingList").innerHTML = "";
  document.getElementById("pendingBox").classList.add("hidden");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

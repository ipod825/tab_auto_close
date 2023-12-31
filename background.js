chrome.runtime.onInstalled.addListener(function () {
  chrome.storage.sync.set({
    urlPattern: [
      "https://docs.google.com/document/d/([^/]*)",
      "https://colab.corp.google.com/drive/([^#]*)",
    ],
  });
});

chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  const { url, tabId } = details;
  replaceExistingTab(url, tabId);
});

chrome.tabs.onUpdated.addListener((_tabId, _changeInfo, tab) => {
  replaceExistingTab(tab.url, tab.id);
});

async function isCurrentTab(tabId) {
  let [currentTab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  return currentTab.id == tabId;
}

async function replaceExistingTab(url, tabId) {
  if (url == "") {
    return;
  }

  // Sanity check to only remove tabId once.
  let isCurrent = await isCurrentTab(tabId);
  if (!isCurrent) {
    return;
  }

  let tabs = await chrome.tabs.query({});
  let data = await chrome.storage.sync.get("urlPattern");
  const urlPattern = (data.urlPattern || []).map((s) => {
    return RegExp(s);
  });
  tabs.some((other) => {
    if (other.id !== tabId && areUrlSimiliar(other.url, url, urlPattern)) {
      chrome.tabs.update(other.id, { active: true });
      chrome.tabs.remove(tabId);
      return true;
    }
  });
}

function areUrlSimiliar(url1, url2, urlPatterns) {
  for (let i = 0; i < urlPatterns.length; ++i) {
    let r = urlPatterns[i];
    let m1 = url1.match(r);
    let m2 = url2.match(r);
    if (m1 == null || m2 == null || m1.length != m2.length) {
      continue;
    }
    let allGroupMatch = true;
    for (let j = 1; j < m1.length; ++j) {
      if (m1[j] != m2[j]) {
        allGroupMatch = false;
        break;
      }
    }
    if (allGroupMatch) {
      return true;
    }
  }
  return url1 == url2;
}

/* globals alert, chrome */
(function() {
  'use strict';

  var active = true;
  var ACTIVE_ICON = '';
  var ACTIVE_NAME = 'Debug YYF (active)';
  var INACTIVE_ICON = '';
  var INACTIVE_NAME = 'YYF Debugger (stop)';

  // list of all tabs with enabled
  var tabsWithExtensionEnabled = ['yyf.yunyin.org', 'http://192.168.23.33/', 'localhost', '127.0.0.1'];

  /**
   * handles a click on the extension icon
   */
  function _handleIconClick(tab) {
    if (tab) {
      _toggleActivity(tab);
    }
  }

  function _toggleActivity(tab) {
    var url = tab.url;
    var host = _getHost(url);
    if (_hostIsActive(host)) {
      delete localStorage[host];
      _deactivate(tab.id);
      return;
    }
    localStorage[host] = true;
    _activate(tab.id);
  }

  function _getHost(url) {
    url = url.replace(/^(https?:\/\/)/, '', url);
    var host = url.split('/')[0];
    return host;
  }

  function _hostIsActive(url) {
    return localStorage[url] === "true";
  }

  function _activate(tabId) {
    active = true;
    if (tabsWithExtensionEnabled.indexOf(tabId) === -1) {
      tabsWithExtensionEnabled.push(tabId);
    }
    _setTitle(tabId, ACTIVE_NAME);
  }

  function _deactivate(tabId) {
    active = false;
    var index = tabsWithExtensionEnabled.indexOf(tabId);
    if (index !== -1) {
      tabsWithExtensionEnabled.splice(index, 1);
    }
    _setTitle(tabId, INACTIVE_NAME);
  }

  function _setIcon(iconPath) {
    chrome.browserAction.setIcon({
      path: iconPath
    });
  }

  function _setTitle(tabId, titleName) {
    chrome.browserAction.getTitle({
      tabId: tabId
    }, function(title) {
      chrome.browserAction.setTitle({
        title: titleName,
        tabId: tabId
      });
    });
  }

  /**
   * A tab has become active.
   * https://developer.chrome.com/extensions/tabs#event-onActivated
   *
   * @param   {[type]}  activeInfo
   *
   * @return  void
   */
  function _handleTabActivated(activeInfo) {
    // This is sometimes undefined but an integer is required for chrome.tabs.get
    if (typeof activeInfo.tabId != 'number') {
      return;
    }
    chrome.tabs.get(activeInfo.tabId, _handleTabEvent);
  }

  /**
   * A tab was updated.
   * https://developer.chrome.com/extensions/tabs#event-onUpdated
   *
   * @param   integer  tabId
   * @param   object   changeInfo
   * @param   object   tab
   *
   * @return  void
   */
  function _handleTabUpdated(tabId, changeInfo, tab) {
    if (changeInfo.status === "loading") {
      _handleTabEvent(tab);
    }
  }

  /**
   * Handle an event for any tab. Activate or deactivate the extension for the current tab.
   *
   * @param   object  tab
   *
   * @return  void
   */
  function _handleTabEvent(tab) {
    if (!(tab && tab.active)) {
      return;
    }
    var id = (typeof tab.id === 'number') ? tab.id : tab.sessionID;

    if (typeof id === 'undefined') {
      return;
    }
    if (_hostIsActive(_getHost(tab.url))) {
      _activate(id);
      return;
    }

    _deactivate(id);
  }

  function _addListeners() {
    var queuedRequests = [];
    chrome.browserAction.onClicked.addListener(_handleIconClick);
    chrome.tabs.onActivated.addListener(_handleTabActivated);
    chrome.tabs.onCreated.addListener(_handleTabEvent);
    chrome.tabs.onUpdated.addListener(_handleTabUpdated);
    var handled_requestId = [];

    chrome.webRequest.onResponseStarted.addListener(function(details) {
      if (tabsWithExtensionEnabled.indexOf(details.tabId) !== -1) {
        if (handled_requestId.includes(details.requestId)) {
          return;
        } else {
          handled_requestId.push(details.requestId);
        }
        chrome.tabs.sendMessage(details.tabId, {
          name: "header_update",
          details: details
        }, function(response) {
          if (!response) {
            queuedRequests.push(details);
          }
        });
      }
    }, {
      types: ["main_frame", "sub_frame", "xmlhttprequest"],
      urls: ['http://*/*', 'https://*/*']
    }, ["responseHeaders"]);

    chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
      switch (request) {
        case 'localStorage':
          sendResponse(localStorage);
          break;
        case 'isActive':
          sendResponse(active);
          break;
        case 'ready':
          sendResponse(queuedRequests);
          queuedRequests = [];
          break;
      }
    });
  }
  _addListeners();
})();

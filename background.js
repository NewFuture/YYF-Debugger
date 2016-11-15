/* run background in  chrome */
(function() {
  'use strict';
  var ACTIVE_ICON = 'icon/active.png';
  var ACTIVE_NAME = 'Debug YYF (active)';
  var INACTIVE_ICON = 'icon/inactive.png';
  var INACTIVE_NAME = 'YYF Debugger (stop)';

  //host 列表
  //the default site
  var hostList = ['localhost', '127.0.0.1', '192.168.23.33', 'yyf.yunyin.org', 'localhost:1122', '127.0.0.1:1122'];
  // is active now;
  var isActive = false;
  // request need to handle
  var queuedRequests = [];
  // list of all tabs with enabled
  //记录开启此扩展的标签页
  var enabledTabs = [];


  /**
   *init at first time
   *初始化storage
   *启动 listener
   */
  function _init() {
    if (localStorage['version']) {
      hostList = localStorage.host.split(',');
    } else {
      localStorage['version'] = chrome.app.getDetails().version;
      localStorage['host'] = hostList.join(',');
    }
    _addListeners();
  }

  /**
   * 解析url域名
   */
  function _getHost(url) {
    return url && (url + '//').split('/', 3)[2];
  }

  /**
   *判断域名是否激活
   * @param string host 域名
   * @todo 模糊匹配
   */
  function _hostIsActive(url) {
    return url && hostList.includes(_getHost(url));
  }

  /**
   * 添加域名
   * @param string host 域名
   * @todo 模糊匹配
   */
  function _hostAdd(url) {
    var host = _getHost(url);
    if (host && !hostList.includes(host)) {
      hostList.push(host);
      localStorage.host = hostList.join(',');
    }
  }

  /**
   * 删除域名
   * @param string host 域名
   * @todo 模糊匹配
   */
  function _hostDelete(url) {
    var host = _getHost(url);
    var index = hostList.indexOf(host);
    if (index > -1) {
      hostList.splice(index, 1);
      localStorage.host = hostList.join(',');
    }
  }


  /**
   * 激活标签页
   * 更新显示
   * @param int tabId 标签页ID
   */
  function _activate(tabId) {
    _setTitle(tabId, ACTIVE_NAME);
    _setIcon(tabId, ACTIVE_ICON);
    isActive = true;
    if (!enabledTabs.includes(tabId)) {
      enabledTabs.push(tabId);
    }
  }

  /**
   * 停止签页扩展
   * @param  int tabId 标签页ID
   */
  function _deactivate(tabId) {
    _setTitle(tabId, INACTIVE_NAME);
    _setIcon(tabId, INACTIVE_ICON);
    isActive = false;
    var index = enabledTabs.indexOf(tabId);
    if (index !== -1) {
      enabledTabs.splice(index, 1);
    }
  }

  /**
   * 修改icon
   */
  function _setIcon(tabId, iconPath) {
    // return;
    chrome.browserAction.setIcon({
      tabId: tabId,
      path: iconPath
    });
  }

  /**
   * 修改title，显示文字
   */
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
   * handles a click on the extension icon
   * 点击图标切换状态
   * @bug
   */
  function _handleIconClick(tab) {
    if (!(tab && tab.id)) {
      return;
    }
    if (enabledTabs.includes(tab.id)) { //active状态
      _deactivate(tab.id);
      _hostDelete(tab.url);
    } else {
      _activate(tab.id);
      _hostAdd(tab.url);
    }
  }

  /**
   * A tab has become active.
   * https://developer.chrome.com/extensions/tabs#event-onActivated
   * @param   {[type]}  activeInfo
   * @return  void
   */
  function _handleTabActivated(activeInfo) {
    // This is sometimes undefined but an integer is required for chrome.tabs.get
    if (typeof activeInfo.tabId === 'number') {
      chrome.tabs.get(activeInfo.tabId, _handleTabEvent);
    }
  }

  /**
   * A tab was updated.
   * https://developer.chrome.com/extensions/tabs#event-onUpdated
   * @param   integer  tabId
   * @param   object   changeInfo
   * @param   object   tab
   * @return  void
   */
  function _handleTabUpdated(tabId, changeInfo, tab) {
    if (changeInfo.status === "loading") {
      _handleTabEvent(tab);
    }
  }

  /**
   * 检查tab状态
   * Handle an event for any tab. Activate or deactivate the extension for the current tab.
   * @param   object  tab
   * @return  void
   */
  function _handleTabEvent(tab) {
    if (!tab) {
      return;
    }
    var id = (typeof tab.id === 'number') ? tab.id : tab.sessionID;
    if (id && tab.url) {
      if (_hostIsActive(tab.url)) {
        _activate(id);
      } else {
        _deactivate(id);
      }
    }
  }

  /**
   * 处理浏览器请求的响应结果
   */
  function _handleResponse(details) {
    if (isActive && enabledTabs.includes(details.tabId)) {
      chrome.tabs.sendMessage(details.tabId, {
        name: "header_update",
        details: details
      }, function(response) {
        if (!response) {
          queuedRequests.push(details);
        }
      });
    }
  }

  /**
   * 消息通讯
   */
  function _onMessage(request, sender, sendResponse) {
    switch (request) {
      case 'localStorage':
        sendResponse(localStorage);
        break;
      case 'isActive':
        sendResponse(isActive);
        break;
      case 'ready':
        sendResponse(queuedRequests);
        queuedRequests = [];
        break;
    }
  }

  /**
   * 开始事件监听
   */
  function _addListeners() {
    chrome.extension.onMessage.addListener(_onMessage); //数据通信
    chrome.browserAction.onClicked.addListener(_handleIconClick); //点击图标
    chrome.tabs.onActivated.addListener(_handleTabActivated); //tab页激活
    chrome.tabs.onCreated.addListener(_handleTabEvent); //tab页创建
    chrome.tabs.onUpdated.addListener(_handleTabUpdated); //table页跟新
    //监听responseheader
    chrome.webRequest.onResponseStarted.addListener(_handleResponse, {
      types: ["main_frame", "sub_frame", "xmlhttprequest"],
      urls: ['http://*/*', 'https://*/*']
    }, ["responseHeaders"]);
  }

  _init();
})();

/* globals chrome, console */
(function() {
    'use strict';

    var PRE_HEADER = 'Yyf-Debug-';
    var local_storage = null;


    function _process(detail) {
        console.group('%s %s [%i]', detail.method, detail.url, detail.statusCode);
        // console.log(detail);
        detail.responseHeaders.forEach(_displayHeader);
        console.groupEnd();
    }

    //解析显示header
    function _displayHeader(header) {
        if (header.name.indexOf(PRE_HEADER) === 0) {
            var headername = header.name.split('-');
            var len = headername.length;
            if (len > 1) {
                var value = header.value;
                switch (headername[len - 1]) {
                    case 'O':
                        value = JSON.parse(value);
                        break;
                    case 'S':
                    case 'N':
                        value = decodeURI(value);
                        break;
                    case 'J':
                        value = JSON.parse(value);
                        break;
                    case 'B':
                        value = (value === 'true');
                        break;
                }
                var type = header.name.slice(PRE_HEADER.length, -2);
                switch (type.toLowerCase()) {
                    case 'info':
                        console.info(value);
                        break;
                    case 'warn':
                        console.warn(value);
                        break;
                    case 'error':
                        console.error(value);
                        break;
                    case 'log':
                        console.log(value);
                        break;
                    default:
                        console.debug("%s:%s", type, value);
                }

            }
        }
    }

    function _handleHeaderUpdate(request, sender, sendResponse) {
        if (request.name === "header_update") {
            // if this is not a header update don't do anything
            _process(request.details);
            return sendResponse("done");
        }
    }

    function _listenForLogMessages() {
        chrome.extension.onMessage.addListener(_handleHeaderUpdate);
    }

    function _stopListening() {
        chrome.extension.onMessage.removeListener(_handleHeaderUpdate);
    }

    function _initStorage() {
        chrome.extension.sendMessage("localStorage", function(response) {
            local_storage = response;
        });
    }

    function _init() {
        _listenForLogMessages();
        chrome.extension.sendMessage('isActive', function(response) {
            if (response === false) {
                return _stopListening();
            }
            return _initStorage();
        });

        chrome.extension.sendMessage('ready', function(queuedRequests) {
            if (queuedRequests) {
                queuedRequests.forEach(function(request) {
                    _process(request);
                });
            }
        });
    }
    _init();
})();
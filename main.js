/* globals chrome, console */
(function() {
  'use strict';
  var proccessd_request_id = [];
  var YYF_FLAG = 'YYF';
  var PRE_HEADER = 'yyf-';
  var TRACER_KEY = ['time', 'mem', 'file', 'tracer'];

  /**不同数据显示样式*/
  var CSS = {
    DEFAULT: ';',
    URL: 'color:black;font-style: italic;',
    YYF: 'color:teal;',
    SERVER: 'color:yellowgreen;',
    GRAY: 'color:Gray;',
    SQL: 'color:OliveDrab;font-weight:lighter;',
    ERROR: 'color:red;font-weight:bolder',
    DUMP: 'color:DodgerBlue;font-weight:bolder;',
    TRACER: 'color:MediumSlateBlue;font-weight:lighter;',
    FILE: function(file) { //文件颜色
      if (file.includes('/Debug')) {
        return 'color:Silver;font-weight:lighter;';
      } else if (file.includes('/Bootstrap/dev.php')) {
        return 'color:Silver;font-weight:bold;';
      } else {
        return 'color:sienna;font-weight:bold;';
      }
    },
    METHOD: function(method) { //请求方式样式
      var color = 'Black '
      switch (method) {
        case 'GET':
          color = 'DarkGreen';
          break;
        case 'POST':
          color = 'DarkBlue';
          break;
        case 'PUT':
          color = 'DarkOrange'; //'DarkMagenta';
          break;
        case 'DELETE':
          color = 'DarkViolet'; //'Brown';
          break;
      }
      return 'color:' + color + ';font-weight: bolder;';
    },
    STATUS: function(code) { //请求状态码样式
      var color =
        code < 200 ? 'Lavender' :
        code < 300 ? 'LimeGreen' :
        code < 400 ? 'orange' :
        code < 500 ? 'yellow' :
        'red';
      return 'color:' + color + ';font-size:small;font-weight:bolder;';
    },
    URLSTATUS: function(code) {
      var color =
        code < 200 ? 'Grey' :
        code < 300 ? 'MediumSeaGreen' :
        code < 400 ? 'GoldenRod' :
        code < 500 ? 'MediumVioletRed' :
        'FireBrick';
      return 'background-color:' + color + ';color:#FFFFF0;font-size:small;font-weight:lighter;';
    }
  };
  /**
   * 自定义控制台 console not display source line
   */
  var YYF_CONSOLE = {
    _console: function(method) {
      return function() {
        setTimeout(console[method].bind.apply(console[method], [console].concat(Array.prototype.slice.call(arguments))));
      }
    }
  };
  //apply the mthod of
  ['table', 'assert', 'clear', 'count', 'debug', 'dir', 'dirxml', 'error', 'group', 'groupCollapsed', 'groupEnd', 'info', 'log', 'profile', 'profileEnd', 'time', 'timeEnd', 'timeStamp', 'warn'].forEach(function(method) {
    YYF_CONSOLE[method] = YYF_CONSOLE._console(method);
  });


  //处理响应数据
  function _process(detail) {
    if (proccessd_request_id.includes(detail.requestId)) {
      return; //防止重复处理
    }
    proccessd_request_id.push(detail.requestId);

    var version = detail.responseHeaders.find(function(h) {
      return h.name === YYF_FLAG;
    });
    if (version) {
      var server = detail.responseHeaders.find(function(h) {
        return h.name.toLowerCase() === "x-powered-by";
      });
      server = server ? ' ' + server.value : '';

      var type = detail.responseHeaders.find(function(h) {
        return h.name.toLowerCase() === "content-type";
      });
      type = type ? ('<' + _parseContentType(type.value) + '>') : '';

      YYF_CONSOLE.group(
        '%c%s %c%s%c [%c%i%c](YYF:%c%s%c%s%c) %c%s',
        CSS.METHOD(detail.method), detail.method,
        CSS.URLSTATUS(detail.statusCode), detail.url,
        CSS.DEFAULT,
        CSS.STATUS(detail.statusCode), detail.statusCode,
        CSS.DEFAULT,
        CSS.YYF, version.value,
        CSS.SERVER, server,
        CSS.DEFAULT,
        CSS.GRAY, type
      );
      detail.responseHeaders.forEach(_displayHeader);
      YYF_CONSOLE.groupEnd();
    }
  }

  function _parseContentType(type) {
    var TYPEMAP = {
      'application/json': 'JSON',
      'text/html': 'HTML',
      'application/xml': 'XML',
      'text/plain': 'TXET',
      'text/javascript': 'JS',
      'text/css': 'CSS'
    }
    if (!type) {
      return '';
    }
    for (var t in TYPEMAP) {
      if (type.includes(t)) {
        return TYPEMAP[t];
      }
    }
    return type;
  }
  //解析显示header
  function _displayHeader(header) {
    var key = header.name.toLowerCase();
    if (key.startsWith(PRE_HEADER.toLowerCase())) {
      key = key.substr(PRE_HEADER.length).toLowerCase();
      var value = header.value;

      if (key.includes('-')) {
        var name = key.split('-');
        if (name[0] === 'sql') {
          _showSQL(value, name[1]);
        } else {
          //dump messge
          _showDump(name.shift(), name.join('-'), value);
        }
      } else {
        if (TRACER_KEY.includes(key)) {
          _showTrace(key, value);
        } else {
          _showLog(key, value);
        }
      }
    }
  }

  //dump 变量
  function _showDump(type, name, value) {
    switch (type) {
      case 'e':
        value = decodeURI(value);
      case 's':
        type = 'string';
        break;

      case 'n':
        type = 'number';
        value = Number(value);
        break;

      case 'b':
        type = 'boolean';
        value = ('true' == value) || (1 == value);
        break;

      case 'o': //object
      case 'j': //json
        value = JSON.parse(value);
        type = Array.isArray(value) ? 'array' : typeof(value);
        if ('object' == type) { //display object
          // formater = '%c[%s (%s)]: %c%o';
          type = value.__CLASS__ || 'associative array'; //php 关联数组
        }
        break;

      case 'u': //unkown
        value = decodeURI(value);
      default:
        type = 'unkown(' + type + ')';
    }
    YYF_CONSOLE.log('%c[%c%s%c (%s)]:', CSS.GRAY, CSS.DUMP, name, CSS.GRAY, type, value);
  }

  //sql 查询结果
  function _showSQL(data, id) {
    id = "00".substring(0, 2 - id.length) + id
    data = JSON.parse(data);
    var sql = data.Q;
    YYF_CONSOLE.groupCollapsed("%c[SQL %s] %cSQL查询信息 (耗时: %f ms) %c[%s]",
      CSS.SQL, id,
      data.E ? CSS.ERROR : CSS.DEFAULT,
      data.T,
      CSS.GRAY, data.Q.substring(0, 6)
    );
    var output = {
      '耗时(ms)': {
        'value': data.T
      },
      '查询语句': {
        'value': data.Q
      },
    };

    //错误状态
    if (data.E) {
      output['查询出错'] = {
        'value': JSON.stringify(data.E)
      };
      //依次解析各个查询参数
      output["SQLSTATE"] = {
        'value': data.E[0]
      };
      output["驱动错误码"] = {
        'value': data.E[1]
      };
      output["驱动错误信息"] = {
        'value': data.E[2]
      };
      YYF_CONSOLE.error('SQL 查询出错[%s]：%s (%i)', data.E[0], data.E[2], data.E[1]);
    }
    //参数
    if (data.P) {
      output['查询参数'] = {
          'value': JSON.stringify(data.P)
        }
        //依次解析各个查询参数
      for (var p in data.P) {
        //replace sql template
        sql = sql.replace(new RegExp("\\" + p + "(?!\\w)", "g"), data.P[p]);
        output["参数" + p] = {
          'value': data.P[p]
        };
      }
    }
    //结果
    if (data.R instanceof Object) {
      output['查询结果'] = {
        'value': JSON.stringify(data.R)
      };
      //依次解析各个查询结果
      for (var i in data.R) {
        var r = data.R[i];
        output['结果:' + i] = {
          'value': (r instanceof Object) ? JSON.stringify(r) : r
        };
      }
    } else {
      output['查询结果'] = {
        'value': data.R
      };
    }
    YYF_CONSOLE.log("%c%s", CSS.SQL, sql);
    YYF_CONSOLE.table(output);
    if (Number.isInteger && Number.isInteger(data.R)) {
      YYF_CONSOLE.info('tips: 为了数据安全,默认只输出[查询结果]条数,可以修改服务器上[conf/app.ini]配置debug.sql.result=1以显示完整结果');
    }
    YYF_CONSOLE.groupEnd();
  }

  /**日志输出
   * 状态 emergency,alert,critical,error,warn,notice,info,debug,
   */
  function _showLog(type, data) {
    var logmsg = '%c[' + type + ']';
    switch (type) {
      case 'emergency':
      case 'alert':
        alert('[' + type + ']' + data);
      case 'critical':
      case 'error':
        YYF_CONSOLE.error(logmsg, CSS.GRAY, data);
        break;

      case 'warning':
      case 'warn':
      case 'notice':
        YYF_CONSOLE.warn(logmsg, CSS.GRAY, data);
        break;

      case 'info':
        YYF_CONSOLE.info(logmsg, CSS.GRAY, data);
        break;

      case 'debug':
        YYF_CONSOLE.debug(logmsg, CSS.GRAY, data);
        break;
      case 'assert': //断言
        YYF_CONSOLE.assert(false, data);
        break;
      default:
        YYF_CONSOLE.log(logmsg, CSS.GRAY, data);
    }
  }

  //系统资源消耗信息信息
  function _showTrace(type, data) {
    try {
      data = JSON.parse(data);
    } catch (e) {
      return _showLog(type, data);
    }

    switch (type) {
      case 'mem': //内存
        YYF_CONSOLE.groupCollapsed('%c[memory]%c 内存消耗信息 (峰值: %i KB)',
          CSS.TRACER,
          CSS.DEFAULT,
          data.M);
        data = {
          '框架启动': {
            'consume[KB]': data.S,
            'comment': '加载框架所消耗内存'
          },
          '程序运行': {
            'consume[KB]': data.U,
            'comment': '程序运行额外使用内存'
          },
          '内存峰值': {
            'consume[KB]': data.M,
            'comment': '整个请求内存占用峰值'
          }
        }
        YYF_CONSOLE.table(data);
        YYF_CONSOLE.info('tips: 开发环境加载调试插件会消耗额外内存');
        break;

      case 'time': //时间
        var total = data.S + data.P + data.U;
        total = Math.round(total * 1000) / 1000;
        YYF_CONSOLE.groupCollapsed('%c[_time_]%c 时间消耗信息 (总计: %f ms)',
          CSS.TRACER,
          CSS.DEFAULT,
          total);
        data = {
          '框架启动': {
            'consume[ms]': data.S,
            'comment': '从获取请求到框架启动完成'
          },
          '分发处理': {
            'consume[ms]': data.P,
            'comment': 'Bootstrap加载插件和分发'
          },
          '程序运行': {
            'consume[ms]': data.U,
            'comment': '业务程序处理和输出耗时'
          },
          '耗时总计': {
            'consume[ms]': total,
            'comment': '从请求到处理完成结束耗时'
          }
        }
        YYF_CONSOLE.table(data);
        YYF_CONSOLE.info('tips: 启动阶段:包括服务器url重写耗时(这部分不属于PHP)');
        YYF_CONSOLE.info('tips: 分发阶段：开发环境加载调试插件会占用大部分时间');
        break;

      case 'file': //文件
        YYF_CONSOLE.groupCollapsed('%c[_file_]%c 文件加载信息 (总计: %i)',
          CSS.TRACER,
          CSS.DEFAULT,
          data.length
        );
        data.forEach(function(file, i) {
          YYF_CONSOLE.log('[%i] %c%s', i, CSS.FILE(file), file);
        });
        YYF_CONSOLE.info('tips: 调试相关文件(library/Debug*)仅在开发环境下加载');
        break;
      default:
        YYF_CONSOLE.groupCollapsed(type);
        YYF_CONSOLE.log(data);
    };
    YYF_CONSOLE.groupEnd();
  }

  function _handleHeaderUpdate(request, sender, sendResponse) {
    if (request.name === "header_update") {
      // if this is not a header update don't do anything
      _process(request.details);
      return sendResponse("done");
    } else if (request.name === "debug") {
      console.log(request);
    }
  }

  function _listenForLogMessages() {
    chrome.extension.onMessage.addListener(_handleHeaderUpdate);
  }

  function _stopListening() {
    chrome.extension.onMessage.removeListener(_handleHeaderUpdate);
  }


  function _init() {

    chrome.extension.sendMessage('isActive', function(response) {
      if (response) { //active addListener
        _listenForLogMessages();
        chrome.extension.sendMessage('ready', function(queuedRequests) {
          if (queuedRequests) {
            queuedRequests.forEach(function(request) {
              _process(request);
            });
          }
        });
      }
    });


  }
  _init();
})();

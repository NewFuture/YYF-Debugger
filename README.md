# YYF Debugger

在浏览器console显示服务器调试信息，不影响页面的正常输出.

(未使用YYF,但只要服务器按照制定格式返回响应头亦可解析！)

## YYF 浏览器调试工具

- [chrome商店安装](https://chrome.google.com/webstore/detail/npmimognecgffdlkeppbkfakcdcpgjak) 感谢[张聪@dancerphil](https://github.com/dancerphil)支持
- [介绍和安装说明](https://newfuture.github.io/YYF-Debugger/)
- [YYF框架](https://github.com/YunYinORG/YYF)

## 源码安装

如果不能打开应用商店(GFW等原因)或者其他浏览器,可以使用源码安装最新版:

1. 下载解压[源码](https://github.com/NewFuture/YYF-Debugger/archive/master.zip),或者`git clone https://github.com/NewFuture/YYF-Debugger.git`
2. 打开扩展页面[`chrome://extensions/`](chrome://extensions/),然后勾选`开发者模式`
3. 加载已解压的扩展程序,选中解压后的文件夹(包含'manifest.json'的文件夹)

## 效果截图

如图在浏览器中显示调试信息 ![console with yyf debbugger](https://newfuture.github.io/YYF-Debugger/images/console.png)

## TODO LIST

- [x] YYF调试header识别和启动切换
- [x] 控制台输出
  - [x] 折叠
  - [x] 不同颜色表示状态
  - [x] 隐藏JS位置提示
- [x] tracer信息解析
  - [x] file 文件加载信息
  - [x] mem 内存统计信息
  - [x] time 时间统计信息
- [x] SQL查询解析
  - [x] 时间统计和折叠提示
  - [x] sql语句和 等效查询语句生成
  - [x] 查询结果显示和提示
  - [x] 错误和参数解析和显示
- [x] Logger日志解析
  - [x] 日志级别和console输出映射
  - [x] alert弹窗
- [x] dump变量输出
  - [x] 基本类型解析显示
  - [x] 数组和关联数组
  - [x] object对象显示[需要优化]
- [ ] 自动打包和release
- [ ] 全局状态开关
- [x] logo
- [ ] 编辑设置
- [ ] 过滤消息
- [ ] popup弹窗提示
- [ ] 多浏览器支持
- [ ] 多语言

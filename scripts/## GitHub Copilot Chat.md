## GitHub Copilot Chat

- Extension: 0.38.2026020602 (prod)
- VS Code: 1.110.0-insider (c7a9f45792fc0b43bda6fbbe0204454c91471a2c)
- OS: win32 10.0.22631 x64
- GitHub Account: nimazasinich

## Network

User Settings:
```json
  "http.systemCertificatesNode": true,
  "github.copilot.advanced.debug.useElectronFetcher": true,
  "github.copilot.advanced.debug.useNodeFetcher": false,
  "github.copilot.advanced.debug.useNodeFetchFetcher": true
```

Environment Variables:
- ALL_PROXY=http://127.0.0.1:10808
- HTTPS_PROXY=http://127.0.0.1:10808
- HTTP_PROXY=http://127.0.0.1:10808

Connecting to https://api.github.com:
- DNS ipv4 Lookup: 140.82.121.5 (162 ms)
- DNS ipv6 Lookup: Error (91 ms): getaddrinfo ENOTFOUND api.github.com
- Proxy URL: http://127.0.0.1:10808 (1 ms)
- Proxy Connection: Error (1 ms): connect ECONNREFUSED 127.0.0.1:10808
- Electron fetch (configured): Error (2022 ms): Error: net::ERR_PROXY_CONNECTION_FAILED
	at SimpleURLLoaderWrapper.<anonymous> (node:electron/js2c/utility_init:2:10684)
	at SimpleURLLoaderWrapper.emit (node:events:519:28)
	at SimpleURLLoaderWrapper.callbackTrampoline (node:internal/async_hooks:130:17)
  [object Object]
  {"is_request_error":true,"network_process_crashed":false}
- Node.js https: Error (2 ms): Error: Failed to establish a socket connection to proxies: PROXY 127.0.0.1:10808
	at PacProxyAgent.<anonymous> (c:\Users\Dreammaker\AppData\Local\Programs\Microsoft VS Code Insiders\c7a9f45792\resources\app\node_modules\@vscode\proxy-agent\out\agent.js:120:19)
	at Generator.throw (<anonymous>)
	at rejected (c:\Users\Dreammaker\AppData\Local\Programs\Microsoft VS Code Insiders\c7a9f45792\resources\app\node_modules\@vscode\proxy-agent\out\agent.js:6:65)
	at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
- Node.js fetch: Error (5 ms): TypeError: fetch failed
	at node:internal/deps/undici/undici:14900:13
	at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
	at async n._fetch (c:\Users\Dreammaker\.vscode-insiders\extensions\github.copilot-chat-0.38.2026020602\dist\extension.js:4784:26170)
	at async n.fetch (c:\Users\Dreammaker\.vscode-insiders\extensions\github.copilot-chat-0.38.2026020602\dist\extension.js:4784:25818)
	at async d (c:\Users\Dreammaker\.vscode-insiders\extensions\github.copilot-chat-0.38.2026020602\dist\extension.js:4816:190)
	at async SA.h (file:///c:/Users/Dreammaker/AppData/Local/Programs/Microsoft%20VS%20Code%20Insiders/c7a9f45792/resources/app/out/vs/workbench/api/node/extensionHostProcess.js:116:41743)
  Error: connect ECONNREFUSED 127.0.0.1:10808
  	at TCPConnectWrap.afterConnect [as oncomplete] (node:net:1637:16)
  	at TCPConnectWrap.callbackTrampoline (node:internal/async_hooks:130:17)

Connecting to https://api.githubcopilot.com/_ping:
- DNS ipv4 Lookup: 140.82.113.21 (114 ms)
- DNS ipv6 Lookup: Error (111 ms): getaddrinfo ENOTFOUND api.githubcopilot.com
- Proxy URL: http://127.0.0.1:10808 (1 ms)
- Proxy Connection: Error (0 ms): connect ECONNREFUSED 127.0.0.1:10808
- Electron fetch (configured): Error (2040 ms): Error: net::ERR_PROXY_CONNECTION_FAILED
	at SimpleURLLoaderWrapper.<anonymous> (node:electron/js2c/utility_init:2:10684)
	at SimpleURLLoaderWrapper.emit (node:events:519:28)
	at SimpleURLLoaderWrapper.callbackTrampoline (node:internal/async_hooks:130:17)
  [object Object]
  {"is_request_error":true,"network_process_crashed":false}
- Node.js https: Error (2 ms): Error: Failed to establish a socket connection to proxies: PROXY 127.0.0.1:10808
	at PacProxyAgent.<anonymous> (c:\Users\Dreammaker\AppData\Local\Programs\Microsoft VS Code Insiders\c7a9f45792\resources\app\node_modules\@vscode\proxy-agent\out\agent.js:120:19)
	at Generator.throw (<anonymous>)
	at rejected (c:\Users\Dreammaker\AppData\Local\Programs\Microsoft VS Code Insiders\c7a9f45792\resources\app\node_modules\@vscode\proxy-agent\out\agent.js:6:65)
	at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
- Node.js fetch: Error (5 ms): TypeError: fetch failed
	at node:internal/deps/undici/undici:14900:13
	at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
	at async n._fetch (c:\Users\Dreammaker\.vscode-insiders\extensions\github.copilot-chat-0.38.2026020602\dist\extension.js:4784:26170)
	at async n.fetch (c:\Users\Dreammaker\.vscode-insiders\extensions\github.copilot-chat-0.38.2026020602\dist\extension.js:4784:25818)
	at async d (c:\Users\Dreammaker\.vscode-insiders\extensions\github.copilot-chat-0.38.2026020602\dist\extension.js:4816:190)
	at async SA.h (file:///c:/Users/Dreammaker/AppData/Local/Programs/Microsoft%20VS%20Code%20Insiders/c7a9f45792/resources/app/out/vs/workbench/api/node/extensionHostProcess.js:116:41743)
  Error: connect ECONNREFUSED 127.0.0.1:10808
  	at TCPConnectWrap.afterConnect [as oncomplete] (node:net:1637:16)
  	at TCPConnectWrap.callbackTrampoline (node:internal/async_hooks:130:17)

Connecting to https://copilot-proxy.githubusercontent.com/_ping:
- DNS ipv4 Lookup: 20.250.119.64 (213 ms)
- DNS ipv6 Lookup: Error (105 ms): getaddrinfo ENOTFOUND copilot-proxy.githubusercontent.com
- Proxy URL: http://127.0.0.1:10808 (2 ms)
- Proxy Connection: Error (2 ms): connect ECONNREFUSED 127.0.0.1:10808
- Electron fetch (configured): Error (2020 ms): Error: net::ERR_PROXY_CONNECTION_FAILED
	at SimpleURLLoaderWrapper.<anonymous> (node:electron/js2c/utility_init:2:10684)
	at SimpleURLLoaderWrapper.emit (node:events:519:28)
	at SimpleURLLoaderWrapper.callbackTrampoline (node:internal/async_hooks:130:17)
  [object Object]
  {"is_request_error":true,"network_process_crashed":false}
- Node.js https: Error (2 ms): Error: Failed to establish a socket connection to proxies: PROXY 127.0.0.1:10808
	at PacProxyAgent.<anonymous> (c:\Users\Dreammaker\AppData\Local\Programs\Microsoft VS Code Insiders\c7a9f45792\resources\app\node_modules\@vscode\proxy-agent\out\agent.js:120:19)
	at Generator.throw (<anonymous>)
	at rejected (c:\Users\Dreammaker\AppData\Local\Programs\Microsoft VS Code Insiders\c7a9f45792\resources\app\node_modules\@vscode\proxy-agent\out\agent.js:6:65)
	at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
- Node.js fetch: Error (4 ms): TypeError: fetch failed
	at node:internal/deps/undici/undici:14900:13
	at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
	at async n._fetch (c:\Users\Dreammaker\.vscode-insiders\extensions\github.copilot-chat-0.38.2026020602\dist\extension.js:4784:26170)
	at async n.fetch (c:\Users\Dreammaker\.vscode-insiders\extensions\github.copilot-chat-0.38.2026020602\dist\extension.js:4784:25818)
	at async d (c:\Users\Dreammaker\.vscode-insiders\extensions\github.copilot-chat-0.38.2026020602\dist\extension.js:4816:190)
	at async SA.h (file:///c:/Users/Dreammaker/AppData/Local/Programs/Microsoft%20VS%20Code%20Insiders/c7a9f45792/resources/app/out/vs/workbench/api/node/extensionHostProcess.js:116:41743)
  Error: connect ECONNREFUSED 127.0.0.1:10808
  	at TCPConnectWrap.afterConnect [as oncomplete] (node:net:1637:16)
  	at TCPConnectWrap.callbackTrampoline (node:internal/async_hooks:130:17)

Connecting to https://mobile.events.data.microsoft.com: Error (2020 ms): Error: net::ERR_PROXY_CONNECTION_FAILED
	at SimpleURLLoaderWrapper.<anonymous> (node:electron/js2c/utility_init:2:10684)
	at SimpleURLLoaderWrapper.emit (node:events:519:28)
	at SimpleURLLoaderWrapper.callbackTrampoline (node:internal/async_hooks:130:17)
  [object Object]
  {"is_request_error":true,"network_process_crashed":false}
Connecting to https://dc.services.visualstudio.com: Error (2029 ms): Error: net::ERR_PROXY_CONNECTION_FAILED
	at SimpleURLLoaderWrapper.<anonymous> (node:electron/js2c/utility_init:2:10684)
	at SimpleURLLoaderWrapper.emit (node:events:519:28)
	at SimpleURLLoaderWrapper.callbackTrampoline (node:internal/async_hooks:130:17)
  [object Object]
  {"is_request_error":true,"network_process_crashed":false}
Connecting to https://copilot-telemetry.githubusercontent.com/_ping: Error (2 ms): Error: Failed to establish a socket connection to proxies: PROXY 127.0.0.1:10808
	at PacProxyAgent.<anonymous> (c:\Users\Dreammaker\AppData\Local\Programs\Microsoft VS Code Insiders\c7a9f45792\resources\app\node_modules\@vscode\proxy-agent\out\agent.js:120:19)
	at Generator.throw (<anonymous>)
	at rejected (c:\Users\Dreammaker\AppData\Local\Programs\Microsoft VS Code Insiders\c7a9f45792\resources\app\node_modules\@vscode\proxy-agent\out\agent.js:6:65)
	at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
Connecting to https://copilot-telemetry.githubusercontent.com/_ping: Error (2 ms): Error: Failed to establish a socket connection to proxies: PROXY 127.0.0.1:10808
	at PacProxyAgent.<anonymous> (c:\Users\Dreammaker\AppData\Local\Programs\Microsoft VS Code Insiders\c7a9f45792\resources\app\node_modules\@vscode\proxy-agent\out\agent.js:120:19)
	at Generator.throw (<anonymous>)
	at rejected (c:\Users\Dreammaker\AppData\Local\Programs\Microsoft VS Code Insiders\c7a9f45792\resources\app\node_modules\@vscode\proxy-agent\out\agent.js:6:65)
	at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
Connecting to https://default.exp-tas.com: Error (2 ms): Error: Failed to establish a socket connection to proxies: PROXY 127.0.0.1:10808
	at PacProxyAgent.<anonymous> (c:\Users\Dreammaker\AppData\Local\Programs\Microsoft VS Code Insiders\c7a9f45792\resources\app\node_modules\@vscode\proxy-agent\out\agent.js:120:19)
	at Generator.throw (<anonymous>)
	at rejected (c:\Users\Dreammaker\AppData\Local\Programs\Microsoft VS Code Insiders\c7a9f45792\resources\app\node_modules\@vscode\proxy-agent\out\agent.js:6:65)
	at process.processTicksAndRejections (node:internal/process/task_queues:105:5)

Number of system certificates: 82

## Documentation

In corporate networks: [Troubleshooting firewall settings for GitHub Copilot](https://docs.github.com/en/copilot/troubleshooting-github-copilot/troubleshooting-firewall-settings-for-github-copilot).
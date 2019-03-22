const { exec } = require("child_process");
const server = require("fb-server");
const log = console.log.bind(console);

let staticConfig = [
	{ path: "examples", alias: "/examples" },
	{ path: "dist", alias: "/dist" },
	{ path: "dev", alias: "/dev" },
	{ path: "src", alias: "/src" },
	{ path: "/", alias: "/" },
];

let proxyConfig = {
	proxyTable: {
		'/api': {
			target: 'http://localhost:8000',
			changeOrigin: false,
			logs: true,
		}
	}
};

let rewritesOptions = {
	//"/js/(.*)": "/test/js/$1",
};

let port = 8000;
let app = server(port, staticConfig, proxyConfig, rewritesOptions);

log(`开发服务器已启动，地址 http://localhost:${port}/`);

switch (process.platform) {
	//mac系统使用 一下命令打开url在浏览器
	case "darwin":
		exec(`open http://localhost:${port}/dev`);
	//win系统使用 一下命令打开url在浏览器
	case "win32":
		exec(`start http://localhost:${port}/dev`);
	// 默认mac系统
	default:
		exec(`open http://localhost:${port}/dev`);
}

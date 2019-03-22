/*
 This file 'test' is part of Firebird Integrated Solution 1.0

 Copyright (c) 2019 Lincong

 Contact:  
        Email: lincong1987@gmail.com

        QQ: 159257119
 
 See Usage at http://www.jplatformx.com/firebird

 Create date: 2019-03-11 15:17
 */

const server = require("fb-server");

let staticConfig = [
	{path: "examples", alias: "/examples"},
	{path: "src"}
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

let app = server(8000, staticConfig, proxyConfig, rewritesOptions);

// 以根目录启动
//let app = server(3000);
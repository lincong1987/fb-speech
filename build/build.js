/*
 This file 'rollup.config.js' is part of Firebird Integrated Solution 1.0

 Copyright (c) 2019 Lincong

 Contact:  
        Email: lincong1987@gmail.com

        QQ: 159257119
 
 See Usage at http://www.jplatformx.com/firebird

 Create date: 2019-03-06 11:31
 */


const fs = require("fs");
const path = require("path");
const rollup = require("rollup");
const babel = require("rollup-plugin-babel");
const resolve = require("rollup-plugin-node-resolve");
const json = require("rollup-plugin-json");
const commonjs = require("rollup-plugin-commonjs");
//const serve = require('rollup-plugin-serve');
const dayjs = require("dayjs");
const make = require("./make");
const package = require("../package.json");
const root = require('app-root-path');
const filewatch = require("fb-filewatch");

const fbdb = require("fb-database");
const FireBird = require("fb-core");
let log = console.log.bind(console);

// 创建数据库
let filedb = (new fbdb("FileSync", "firebird.config.json")).db;

filedb.defaults({
	entrys: [],
	ignores: [/(^|[\/\\])\../],
	
}).write();

log("ignores", filedb.get("ignores"))

let watcher = filewatch.watch([`${root.path}/src`, `${root.path}/examples`], {
	ignored: filedb.get("ignores"),
	persistent: true
});

// 


watcher
	.on('addDir', path => {
		log(`文件夹已被监听 ${path}`)
	})
	.on('unlinkDir', path => {
		log(`文件夹已被移除 ${path}`)
	})
	.on('error', error => {
		log(`监听发生异常 ${error}`)
	})
	.on('ready', () => {

		let paths = watcher.getWatched();
		let absPaths = [];

		FireBird._.each(paths, (i,n)=>{
			log()
			return 1
		})


		filedb.set("absPaths", absPaths).write();


		log('文件监听服务已经开启')
	})
	.on('raw', (event, path, details) => {
		// log('文件监听信息:', event, path, details);

		if(event === "modified") {
			log(`文件已被修改 ${path}`);

			if(/\.html$/.test(path)){

				let html = fs.readFileSync(path);
				
				


				debugger

			}




		}


	});

// 'add', 'addDir' and 'change' events also receive stat() results as second
// argument when available: http://nodejs.org/api/fs.html#fs_class_fs_stats
// watcher.on('change', (path, stats) => {
// 	if (stats) console.log(`File ${path} changed size to ${stats.size}`);
// });




watcher.on('fallback', function (limit) {
	console.log('Ran out of file handles after watching %s files.', limit);
	console.log('Falling back to polling which uses more CPU.');
	console.log('Run ulimit -n 10000 to increase the limit for open files.');
});





(async function () {

	let output = {
		banner: `/* ${package.name}.js v${package.version} | ${dayjs().format()} | lincong1987@gmail.com */
		
		/*@add(fb-polyfill)*/
		
		`,
		format: 'umd',
		inlineDynamicImports: true,
		legacy: true,
		name: 'FireBird',
		exports: 'named',
		//globals: ['lodash', "jquery", "dayjs"]
	};

	console.log("开始打包")
	const bundle = await rollup.rollup({
		input: 'src/index.js',
		//external: ['lodash', "jquery", "dayjs"],
		plugins: [
			resolve({
				jsnext: true,
				main: true,
				browser: true
			}),
			commonjs({
				sourcemap: true,
				ignoreGlobal: false,  // Default: false
			}),
			json(),
			babel({
				exclude: 'node_modules/**',
				babelrc: true,
				comments: true,
				runtimeHelpers: true
			}),

			// serve({
			// 	contentBase: [""],
			// 	host: '0.0.0.0',
			// 	port: 10001,
			// 	headers: {
			// 		'Access-Control-Allow-Origin': '*'
			// 	}
			// })
		]
	}).catch(e => {
		console.log("打包出错")
		console.log(e)
	});


	console.log("编译代码")
	// const {code, map} = await bundle.generate(output);

	bundle.generate(output).then((options) => {
		console.log("尝试写入代码")
		make.buildBySource(options.output[0].code, 'fb-core.js', 'fb-core.min.js');
		console.log("任务完成")
	}).catch(e => {
		debugger
		console.log(e)
	})


});

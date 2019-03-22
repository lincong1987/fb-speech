
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

(async function () {

	let output = {
		banner: `/* ${package.name}.js v${package.version} | ${dayjs().format()} | lincong1987@gmail.com */
		
		/*@add(fb-polyfill)*/
		
		`,
		format: 'umd',
		inlineDynamicImports: false,
		legacy: false,
		name: 'FireBirdRecorder',
		//exports: 'named',
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
		console.error(e)
	});


	console.log("编译代码")
	// const {code, map} = await bundle.generate(output);

	bundle.generate(output).then((options) => {
        console.log("尝试写入代码")
        // polyfill = fs.readFileSync(require.resolve("fb-polyfill"));
		make.buildBySource(options.output[0].code, 'fb-speech.js', 'fb-speech.min.js');
		console.log("任务完成")
	}).catch(e => {
		console.error(e)
	})


})();

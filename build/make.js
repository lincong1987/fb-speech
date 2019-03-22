/*
 This file 'make' is part of Firebird Integrated Solution 1.0

 Copyright (c) 2019 Lincong

 Contact:  
        Email: lincong1987@gmail.com

        QQ: 159257119
 
 See Usage at http://www.jplatformx.com/firebird

 Create date: 2019-03-06 11:32
 */

/**
 * 1. 构建出源码版本
 * 2. 执行此脚本 node build.js
 */

let fs = require('fs')
let path = require('path')
let uglifyjs = require('uglify-js')
let es3ify = require("es3ify")

function optimize(source) {

	/**
	 * 因为 typeof 的问题，Babel 会加上下面这段代码，因此要删掉
	 *
	 * var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
   *   return typeof obj;
   * } : function (obj) {
   *   return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
   * };
	 *
	 */

	source = source.replace(
		/var _typeof = typeof Symbol [\s\S]+?};/,
		''
	)

	/**
	 * Babel 会把 typeof a === x 编译成 ((typeof a === 'undefined' ? 'undefined' : _typeof(a))) === x
	 * 这里替换回 typeof a
	 */
	source = source.replace(
		/\(typeof \w+ === 'undefined' \? 'undefined' : _typeof\(\w+\)\)/g,
		function ($0) {
			return 'typeof ' + $0.split(' ')[1]
		}
	)


	/**
	 * 把 Object.freeze 去掉
	 */
	source = source.replace(
		/Object\.freeze\(([^)]+)\)/g,
		function ($0, $1) {
			return $1
		}
	)

	/**
	 * 改写继承函数
	 */
	source = source.replace(
		/var inherits = function[\s\S]+?};/,
		`
var inherits = function (subClass, superClass) {
  subClass.prototype = extend({}, superClass.prototype, subClass.prototype);
};
    `
	)

	/**
	 * 改写 possibleConstructorReturn 函数
	 */
	source = source.replace(
		/var possibleConstructorReturn = function[\s\S]+?};/,
		`
var possibleConstructorReturn = function (self, call) {
  return self
};
    `
	)

	/**
	 * 把 classCallCheck 去掉
	 */
	source = source
		.replace(
			/var classCallCheck = function[\s\S]+?};/g,
			''
		)
		.replace(
			/classCallCheck\(this, \w+\);/g,
			''
		)

	/**
	 * 类属性 value: function has$$1
	 * 转成 value: function
	 */
	source = source.replace(
		/\.prototype\.(\w+) = function [$\w]+\(/g,
		function ($0, $1) {
			return '.prototype.' + $1 + ' = function ('
		}
	)


	/**
	 * var Node$2 = function Node(type) {
   *   classCallCheck(this, Node);
   *   this.type = type;
   * };
	 *
	 * 此例改成
	 *
	 * var Node$2 = function Node$2(type) {
   * 	 classCallCheck(this, Node$2);
   * 	 this.type = type;
   * }
	 */
	source = source.replace(
		/var ([\w$]+) = function (\w+)\([^)]+\) {\n\s+classCallCheck\(this, \w+\);/g,
		function ($0, $1, $2) {
			if ($1 !== $2) {
				let [part1, part2] = $0.split('=')
				part2 = part2.replace(new RegExp(`\\b${$2}\\b`, 'g'), $1)
				return `${part1}=${part2}`
			}
			return $0
		}
	)

	/**
	 * babel 会把函数 function Node {} 转成 var Node = function Node {}
	 * 我们全都转成匿名函数
	 */
	source = source.replace(
		/(\b)([\w$]+) = function ([\w$]+)/g,
		function ($0, $1, $2, $3) {
			if ($2 === $3) {
				return `${$1}${$2} = function `
			}
			throw new Error(`${$1} is not equals to ${$2}`)
		}
	)

	/**
	 * 把 new TypeError 转成 new Error
	 */
	source = source.replace(
		/new TypeError/g,
		'new Error'
	)

	/**
	 * 把 var name = void 0 转成 var name
	 */
	source = source.replace(
		/(\w+) = void 0/g,
		function ($0, $1) {
			return $1
		}
	)

	/**
	 * 处理 legacy 版本
	 */
	if (/shim start/.test(source)) {
		let shim = ''
		source = source
			.replace(
				/\/\/ shim start([\s\S]+?)\/\/ shim end/,
				function ($0, $1) {
					shim = $1
					return ''
				}
			)
			.replace(
				/'use strict';/,
				function ($0) {
					return $0 + shim
				}
			)
	}


	source = es3ify.transform(source);


	// source = source
	// 	.replace(
	// 		/\/\/ shim start([\s\S]+?)\/\/ shim end/,
	// 		function ($0, $1) {
	// 			shim = $1
	// 			return ''
	// 		}
	// 	)


	return source

}

function minify(source) {
	return uglifyjs.minify(
		source,
		{
			compress: {
				warnings: false,
				// see https://github.com/ecomfe/edp/issues/230
				conditionals: false,
				properties: false,
			},
			mangle: {
				reserved: ['require', 'exports', 'module', "$"],
			},
			output: {
				quote_keys: true
			},
			sourceMap: {},
			//ie8: true
		}
	)
}

function readFile(file) {
	return fs.readFileSync(path.join(__dirname, '../dist', file)).toString()
}

function writeFile(file, content) {
	fs.writeFileSync(path.join(__dirname, '../dist', file), content)
}

exports.build = function (file, minifiedFile) {
	let sourceMapFile = `${file}.map`
	let source = optimize(readFile(file))
	let minified = minify(source)
	writeFile(file, source)
	writeFile(minifiedFile, minified.code)
	writeFile(sourceMapFile, minified.map)
}

exports.buildBySource = function (source, file, minifiedFile, polyfill = "") {
 
	source = polyfill + optimize(source);

	console.log(`${file} ${(source.length / 1024).toFixed(0)} KB`)
	let sourceMapFile = `${file}.map`
	let minified = minify(source);

	console.log("写入代码")


	writeFile(file, source)
	console.log(`写入min code, ${minifiedFile}: ${(minified.code.length / 1024).toFixed(0)} KB`)
	writeFile(minifiedFile, minified.code)
	console.log("写入source map")
	writeFile(sourceMapFile, minified.map)
}


// build('fb-core.js', 'fb-core.min.js');
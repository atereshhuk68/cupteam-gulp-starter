//* Gulp moduls
const { src, series, parallel, watch, dest } = require("gulp");
//* Webpack Stream
const _webpack = require("webpack-stream");
//* Styles
const _sass = require("gulp-sass");
const _cssconcat = require("gulp-concat-css");
const _cssnano = require("gulp-cssnano");
const _autoprefixer = require("gulp-autoprefixer");
//* HTML
const _fileinclude = require("gulp-file-include");
const _htmlbeautify = require("gulp-html-beautify");
//* Server
const _bs = require("browser-sync").create();
//* Files
const _imagemin = require("gulp-imagemin");
const _cache = require("gulp-cache");
const _ttf2woff = require("gulp-ttf2woff");
const _ttf2woff2 = require("gulp-ttf2woff2");
const _fs = require("fs");
const _webp = require("gulp-webp");
const _webphtml = require("gulp-webp-in-html");
//* Stylelint
const _stylelint = require("gulp-stylelint");
//* PurgeCss
const _purgecss = require("gulp-purgecss");

//! Webpack Mode
let isDev = true;

//! Webpack Config
let webpackConf = {
	watch: true,
	mode: isDev ? 'development' : 'production',
	devtool: isDev ? 'eval-source-map' : 'none',
	output: {
		filename: "all.js",
	},
	module: {
		rules: [
			{
				test: /\.m?js$/,
				exclude: /node_modules/,
				use: {
					loader: "babel-loader",
				},
			},
		],
	},
};

//! Styles
/*
 * sass to css
 */
const sassScss = () => {
	return src("src/scss/*.scss")
		.pipe(
			_sass({
				includePaths: ["src/scss"],
				errLogToConsole: true,
				outputStyle: "compressed",
			})
		)
		.pipe(
			_autoprefixer({
				flex: true,
				grid: true,
				cascade: true,
			})
		)
		.pipe(dest("build/css"));
};
/*
 * concat and compress CSS libs
 */
const concatCSS = () => {
	return src(["src/css/*.css", "!src/css/style.css"])
		.pipe(_cssconcat("bundle.css"))
		.pipe(
			_autoprefixer({
				flex: true,
				grid: true,
				cascade: true,
			})
		)
		.pipe(_cssnano())
		.pipe(dest("build/css"));
};
/*
* perfect css. lint css and remove useless css 
*/
const perfectCSS = () => {
	return src("build/css/*.css")
	.pipe(_purgecss({
		content: ['build/**/*.{html,js}'],
	}))
	.pipe(_stylelint({
		fix: true
	}))
	.pipe(_cssnano())
	.pipe(dest('build/css'))
}
//! HTML
/*
 * include html files
 */
const fileinclude = () => {
	return src("src/pages/*.html")
		.pipe(
			_fileinclude({
				prefix: "@@",
				basepath: "@file",
			})
		)
		.pipe(
			_htmlbeautify({
				indent_with_tabs: true,
				indent_size: 4,
			})
		)
		.pipe(dest("build"));
};
/*
 * add webp to html
 */
const addWebpToHtml = () => {
	return src(["build/*.html"]).pipe(_webphtml()).pipe(dest("build"));
};
//! Call this task when you finish a project
exports.addWebpToHtml = addWebpToHtml;
//! DevServer
/*
 * devserver config
 */
const browsersync = () => {
	_bs.init({
		server: {
			baseDir: "build/",
		},
		files: ["build/*.html", "build/js/all.js", "build/**/*.css"],
		notify: false,
		open: "local",
		ghostMode: {
			clicks: true,
			forms: true,
			scroll: false,
		},
	});
};
//! Fonts
/*
 * tasks for font: convert, add to file _fonts.scss, move to build folder
 */
const fontVals = {
	thin: 100,
	thinitalic: 100,
	light: 300,
	lightitalic: 300,
	regular: 400,
	regularitalic: 400,
	medium: 500,
	mediumitalic: 500,
	semibold: 600,
	semibolditalic: 600,
	bold: 700,
	bolditalic: 700,
	extrabold: 800,
	extrabolditalic: 800,
	black: 900,
	blackitalic: 900,
};
const fontWeight = (font) => {
	Object.keys(fontVals).forEach((key) => {
		if (font.toLowerCase().includes(key)) return fontVals[key];
	});
};
const convertFonts = () => {
	src("src/fonts/*.ttf").pipe(_ttf2woff()).pipe(dest("build/fonts/"));
	return src(["src/fonts/*.ttf"]).pipe(_ttf2woff2()).pipe(dest("build/fonts/"));
};
const fontScss = "src/scss/_fonts.scss";
const fontsStyle = () => {
	let file_content = _fs.readFileSync(fontScss);
	_fs.readdir("src/fonts", function (err, items) {
		try {
			if (items) {
				let c_fontname;
				for (let i = 0; i < items.length; i++) {
					let fontname = items[i].split(".");
					fontname = fontname[0];
					if (c_fontname != fontname) {
						_fs.appendFile(
							`${fontScss}`,
							`@include font-face("${fontname}", "${fontname}", ${fontWeight(
								fontname
							)});\r\n`,
							() => {}
						);
					}
					c_fontname = fontname;
				}
			}
		} catch (err) {
			throw err;
		}
	});
};

//! Images
const convertToWebp = () => {
	return src("src/img/**/*.{jpg,png}").pipe(_webp()).pipe(dest("build/img"));
};
const compressImgs = () => {
	return src("src/img/**/*.{jpg,png,svg,webp}")
		.pipe(_cache(_imagemin()))
		.pipe(dest("build/img"));
};
//! JS
const jsTask = () => {
	return src("src/js/index.js")
		.pipe(_webpack(webpackConf))
		.pipe(dest("build/js/"));
};

//! Watch
/*
 * task for files watching
 */
const startWatch = () => {
	watch("src/pages/**/*.html", fileinclude);
	watch("src/scss/**/*.scss", sassScss);
	watch("src/fonts/*.ttf", series(convertFonts, fontsStyle));
	watch("src/img/", series(convertToWebp, compressImgs));
	watch("src/js/*.js", jsTask);
	watch(["src/css/*.css", "!src/css/style.css"], concatCSS);
};

//? Dev
exports.default = parallel(
	concatCSS,
	compressImgs,
	jsTask,
	fileinclude,
	sassScss,
	browsersync,
	startWatch
);

//? Perfect CSS
exports.perfect = series(perfectCSS)

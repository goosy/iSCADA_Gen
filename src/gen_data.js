import assert from 'assert/strict';
import { readdir } from 'fs/promises';
import { posix } from 'path';
import { convert } from 'gooconverter';
import { converter } from './converter.js';
import { GCL } from './gcl.js';
import { context, write_file } from './util.js';

/** 
 * @typeof {object} Area 
 * @property {import('yaml').Document} document - 文档
 * @property {Array} list - 列表
 * @property {string|string[]} includes - 包括列表
 * @property {string[]} files - 文件列表
 * @property {object} options - 选项
 */

/** @type {object.<string, Area[]>}*/
const conf_list = {};
Object.keys(converter).forEach(feature => {
  // 初始化conf_list
  conf_list[feature] = [];
});

const configs = { // config 资源
  get(config_name) {
    // 从已有config中找，如没有则建立一个初始config资源数据
    return configs[config_name] ??= {
      name: config_name,
      // device, 由config文档设置
      output_dir: config_name,           // 输出文件夹
      add_feature(feature, document) {// 按功能压入Document
        this[feature] = document;
      }
    };
  },
};
Object.defineProperty(configs, 'get', {
  enumerable: false,
  configurable: false,
  writable: false
});


/**
 * 加载指定文档
 * 生命周期为第一遍扫描，主要功能是提取符号
 * @date 2022-07-03
 * @param {import('yaml').Document} document
 */
async function add_conf(document) {
  // feature
  const feature = Object.keys(converter).find(name => converter[name].is_feature(document.feature));
  if (!feature) {
    console.error(`不支持 ${document.gcl.file} 文件的 ${document.feature} 功能转换!`);
    return;
  }

  // config
  const config = document.config;
  if (config[feature]) {
    console.error(`"${document.gcl.file}"文件的配置 (${document.config}-${feature}) 已存在`);
    process.exit(2);
  }
  // 按类型压入文档至config
  config.add_feature(feature, document);

  // 传递节点以便定位源码位置
  const list = document.get('list')?.items ?? [];
  const options = document.get('options')?.toJSON() ?? {};
  const name = config.name;
  if (options.output_file) options.output_file = convert({ name, config: name }, options.output_file);
  const area = { document, list, options };
  const initialize_list = converter[feature].initialize_list;
  if (typeof initialize_list === 'function') initialize_list(area);
  conf_list[feature].push(area);
}

export async function gen_data({ output_zyml, noconvert, silent } = {}) {
  const work_path = context.work_path;

  // 第一遍扫描 加载配置\提取符号\建立诊断信息
  try {
    silent || console.log('\nreadding GCL files: 读取配置文件：');
    const docs = [];
    for (const file of await readdir(work_path)) {
      if (/^.*\.ya?ml$/i.test(file)) {
        const filename = posix.join(work_path, file);
        const gcl = new GCL();
        await gcl.load(filename);
        for (const doc of gcl.documents) {
          doc.config = configs.get(doc.config);
          Object.defineProperty(doc, 'config', {
            enumerable: true,
            configurable: false,
          });
          // 确保config优先处理
          if (doc.feature === 'config') docs.unshift(doc);
          else docs.push(doc);
        }
        silent || console.log(`\t${filename}`);
      }
    }
    for (const doc of docs) {
      await add_conf(doc);
    }
  } catch (e) {
    console.log(e);
  }

  // 第二遍扫描 补全数据
  for (const feature of Object.keys(converter)) {
    const list = conf_list[feature];
    const build_list = converter[feature].build_list;
    if (typeof build_list === 'function') list.forEach(build_list);
  };

  // 校验完毕，由 noconvert 变量决定是否输出
  if (noconvert) return [[], []];

  // 输出无注释配置
  if (output_zyml) {
    console.log('output the uncommented configuration file:');
    const options = {
      commentString() { return ''; }, //注释选项
      indentSeq: false                //列表是否缩进
    }
    for (const [name, config] of Object.entries(configs)) {
      // 生成无注释的配置
      const yaml = Object.keys(converter).reduce(
        (docs, feature) => config[feature] ? `${docs}\n\n${config[feature].toString(options)}` : docs,
        `# config ${name} configuration`
      );
      const filename = `${posix.join(work_path, config.output_dir, name)}.zyml`;
      await write_file(filename, yaml);
      console.log(`\t${filename}`);
    }
  }

  // 第三遍扫描 生成最终待转换数据
  const copy_list = [];
  const convert_list = [];
  for (const feature of Object.keys(converter)) {
    for (const item of conf_list[feature]) {
      const gen_copy_list = converter[feature].gen_copy_list;
      assert.equal(typeof gen_copy_list, 'function', `innal error: gen_${feature}_copy_list`);
      const ret = gen_copy_list(item);
      assert(Array.isArray(ret), `innal error: gen_${feature}_copy_list(${item}) is not a Array`);
      copy_list.push(...ret);
    }

    // push each gen_{feature}(feature_item) to convert_list
    const gen = converter[feature].gen;
    assert.equal(typeof gen, 'function', 'innal error');
    convert_list.push(...gen(conf_list[feature]));
  };

  return [copy_list, convert_list];
}

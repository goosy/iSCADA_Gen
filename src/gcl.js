import assert from 'assert/strict';
import { readFile } from 'fs/promises';
import { createHash } from 'crypto';
import {
    Document, parseAllDocuments,
    isMap, isSeq, isAlias, isScalar,
    LineCounter,
    visit,
} from 'yaml';
import { STRING, ensure_value, nullable_value } from './value.js';

function merge(document) {
    visit(document, {
        Pair(key, pair, path) {
            if (pair.key && pair.key.value === '<<') {
                const parent = path[path.length - 1];
                const range = [pair.key.range[0], pair.value.range[2]];
                const not_a_alias = new SyntaxError(`merge value must be a alias 合并值必须是别名`);
                not_a_alias.range = range;
                assert(isAlias(pair.value), not_a_alias);
                parent.items.splice(key, 1);
                const source = pair.value.resolve(document);
                const not_a_map = new SyntaxError(`merge value must be a Map 合并引用值必须是对象`);
                not_a_map.range = range;
                assert(isMap(source), not_a_map);
                let len = 0;
                source.items.forEach(node => {
                    if (parent.has(node.key.value)) return;
                    len++;
                    parent.items.unshift(node);
                });
                return key + len;
            }
        },
    })
    visit(document, {
        Alias(_, node) {
            return node.resolve(document);
        }
    })
}

export function isString(node) {
    return isScalar(node) &&
        ['PLAIN', 'QUOTE_DOUBLE', 'QUOTE_SINGLE'].includes(node.type);
}

export class GCL {
    #file;
    get file() {
        return this.#file;
    }
    /** @type {Document[]} */
    #documents;
    get documents() {
        return this.#documents;
    }
    #source;
    get source() {
        return this.#source;
    }
    #line_counter;
    get_pos_data(start, end) {
        const pos = this.#line_counter.linePos(start);
        const code = this.#source.substring(start, end).trim();
        return { ...pos, code };
    }
    get_pos_info(start, end) {
        const document = this.#documents.find(doc => {
            const range = doc.contents.range;
            return range[0] < start && end < range[2];
        })
        const docinfo = document
            ? `
        文档:${document.get('config')}-${document.get('feature')}`
            : '';
        const pos_data = this.get_pos_data(start, end);
        return `
        文件:${this.#file}${docinfo}
        代码:L${pos_data.line} C${pos_data.col}: ${pos_data.code}`;
    }
    #MD5;
    get MD5() {
        return this.#MD5;
    }

    constructor() {
        this.#line_counter = new LineCounter();
    }

    async load(yaml, options = {}) {
        const {
            encoding = 'utf8',
            isFile = true,
        } = options;
        if (isFile) {
            this.#file = yaml;
            this.#source = (await readFile(this.#file, { encoding }));
            yaml = this.#source;
        } else {
            this.#file = '';
            this.#source = yaml;
        }
        this.#MD5 = createHash('md5').update(this.#source).digest('hex');

        const documents = this.#documents = [];
        for (const document of parseAllDocuments(yaml, { version: '1.2', lineCounter: this.#line_counter })) {
            documents.push(document);
            try {
                // yaml library only support merge key in YAML 1.1
                merge(document);
            } catch (error) {
                console.error(`${error.message}:${this.get_pos_info(...error.range)}`);
                process.exit(1);
            }

            function get_from_name() {
                const name = nullable_value(STRING, document.get('name'))?.value;
                if (name == null) return null;
                assert(
                    /^[a-zA-Z_][a-zA-Z0-9_]*(,[a-zA-Z_][a-zA-Z0-9_]*)*-[a-zA-Z]+$/.test(name),
                    new Error(`name:${name} is not incorrect 名字不正确！`)
                );
                const [configs, feature] = name.split('-');
                return [configs.split(','), feature];
            };
            function get_from_other() {
                const config = document.get('config') ?? options.config;
                const configs = isSeq(config)
                    ? config.items.map(item => ensure_value(STRING, item).value)
                    : [config];
                const feature = document.get('feature') ?? options.feature;
                return [configs, feature];
            }
            const [configs, feature] = get_from_name() ?? get_from_other();

            const error = new SyntaxError(`"${this.file}"文件中有一文档的 name 或者 config,feature 没有正确提供!`);
            assert(typeof feature === 'string', error);
            assert(configs.length > 0, error);
            configs.forEach((config, index) => {
                assert(typeof config === 'string' && config !== '', error);
                // if multi config then clone document
                const doc = index === 0 ? document : document.clone();
                if (index > 0) documents.push(doc);
                doc.gcl = this;
                doc.offset ??= 0;
                doc.config = config;
                Object.defineProperty(doc, 'feature', {
                    get() {
                        return feature;
                    },
                    enumerable: true,
                    configurable: false,
                });
            });
        }
    }
}

import { convert } from 'gooconverter';
import { STRING } from '../value.js';

export function is_feature(feature) {
    return feature.toLowerCase() === 'config';
}

const template = `// 本代码由 iSCADA_GEN 自动生成。author: goosy.jo@gmail.com
// 配置文件: {{gcl.file}}
// 摘要: {{gcl.MD5}}
`;

/**
 * 第一遍扫描 提取符号
 * @date 2022-02-07
 * @param {S7Item} VItem
 * @returns {void}
 */
export function initialize_list(area) {
    const document = area.document;
    area.list = area.list.map(node => {
        const FN = { node, comment: new STRING(node.get('comment') ?? '') };
        return FN;
    });
}

export function build_list({ document, options }) {
    const config = document.config;
    const name = config.name;
    if (options.output_dir) config.output_dir = convert({ name, config: name }, options.output_dir);
}

export function gen(config_list) {
    const config_rules = [];
    config_list.forEach(({ document, list, options }) => {
        const { config, gcl } = document;
        const { output_dir, platform } = config;
        const { output_file } = options;
        if (list.length) config_rules.push({
            "name": `${output_dir}/${output_file ?? 'config'}.resources`,
            "tags": {
                platform,
                includes,
                list,
                gcl,
            }
        });
    });
    return [{ rules: config_rules, template }];
}

export function gen_copy_list() {
    return [];
}

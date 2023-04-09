import { STRING } from '../value.js';
import { isMap } from 'yaml';
export const platforms = ['step7'];

export function is_feature(feature) {
    return feature.toUpperCase() === 'TGD';
}

const template = `4096{{#for prop in tgd.alias}}
@{{prop.name}}@={{prop.tag}}&{{prop.desc}}{{#endfor prop}}
`;

/**
 * 第一遍扫描 提取符号
 * @date 2021-12-07
 * @param {S7Item} tgd_area
 * @returns {void}
 */
export function initialize_list(area) {
    const document = area.document;
    area.list = area.list.map(node => {
        const tgd = {
            node,
            comment: new STRING(node.get('comment') ?? '')
        };
        const prefix = new STRING(node.get('prefix') ?? '');
        const name = node.get('name');
        if (!name) throw new Error('name 不能为空!'); // 空tgd不处理
        tgd.name = new STRING(name);
        const alias = node.get('alias');
        if (!isMap(alias)) throw new Error('alias 必须是对象');

        tgd.alias = alias.items.map(item => {
            const name = item.key.value;
            const value = new STRING(item.value.value);
            const [tag_name, desc] = (value.value).split('&');
            const tag = tag_name === ''? '' : prefix + tag_name;
            return { name, tag, desc };
        });

        return tgd;
    });
}

export function gen(tgd_list) {
    const rules = [];

    tgd_list.forEach(({ document, list }) => {
        const { output_dir } = document.config;
        list.forEach(tgd => {
            rules.push({
                "name": `${output_dir}/${tgd.name}.tgd`,
                "tags": {
                    tgd,
                }
            })
        })
    });
    return [{ rules, template }];
}

export function gen_copy_list() {
    return [];
}

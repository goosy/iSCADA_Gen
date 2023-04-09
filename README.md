# iSCADA_Gen

本程序为iSCADA资源文件生成器，用户只要配置好配置文件，运行生成器会产生 iSCADA 对应功能所需要的资源文件。

## 安装 install

* npm: `npm install iscada-gen -G`
* yarn: `yarn global add iscada-gen`
* pnpm: `pnpm add iscada-gen -G`

## 使用 usage

### 生成一个配置文件夹模板

```bash
igen gcl
```

执行后会在当前文件夹中生成一个名为GCL的配置文件夹，该文件夹内含样本配置文件和一份说明文件README.md。

可以进入到GCL文件夹对样本配置进行修改，然后再在GCL文件夹下用 `igen` 去生成源码。

### 生成iSCADA资源文件

在配置文件夹下运行

```bash
igen
```

### 用法帮助

执行 `igen help` 查看生成器命令帮助

## 配置文档语法

配置文档采用YAML语法

一个文档的示例如下：

```YAML
---
# name 指令相当于 config 和 feature 指令的组合
#config: JS    # 指示属于哪一个项目
#feature: tgd  # 指示点表功能
name: GD-TGD

list:
- name: ROVN211
  prefix: P072_ROVN211_
  alias:
    HSC: CLOSE_CMD&关命令
    HSO: OPEN_CMD&开命令
    HSP: STOP_CMD&停命令
    RL: REMOTE&就地/远程
    THIS: '&1#泵进口阀'
    VP: VP&阀位
    XA: '&故障'
    XI: '&电机运行状态'
    ZIC: CP&关到位
    ZIO: OP&开到位
- name: ROVN212
  prefix: P072_ROVN212_
  alias:
    HSC: CLOSE_CMD&关命令
    HSO: OPEN_CMD&开命令
    HSP: STOP_CMD&停命令
    RL: REMOTE&就地/远程
    THIS: '&名称'
    VP: VP&阀位
    XA: '&故障'
    XI: '&电机运行状态'
    ZIC: CP&关到位
    ZIO: OP&开到位
...
```

* `---` YAML语法，它指示一个配置文档开始；
* `...` YAML语法，它指示一个配置文档结束；
* 一个配置文档为一个基本配置单位，不可分割；
* 可以在一个文件里书写多个配置文档，当然也可以将配置文档分散在多个文件中；
* 每个文档的根属性称为指令，比如上方的 `feature` `config` `list` `options`

注意指令兼容性，运行 `igen -v` 查看生成器的当前指令版本。

## 指令说明

### 必须书写的指令

配置文档必须有 `name` 指令，或 `config`,`feature` 组合指令，两种方法用一种。

这2个指令值类型都是字符串，name 相当于后2者组合而成  `<config>-<feature>` ，作用一样，推荐 name 便于理解文档唯一性。

每个文档的 name 必须唯一，即相同 config 和 feature 组合的配置文档只能有一个。

目前只实现了2种类型配置文档——config文档和8种功能文档，由 `feature` 指令指示，不区分大小写。即：

* `config`        config文档
  指示这是一个config功能，使用该config的其它配置文档都共享的资源、信息和指令。
  所有属于同一config的配置文件，会在生成代码时，统一检查资源冲突情况、统一资源分配等。
* `TGD`           点组功能文档

具体功能文档的配置和说明可参看 example 目录下的YAML文件

### 所有文档都可选的指令

#### options 选项参数

* 类型: 键值对

一些额外设定，比如 options.output_file 设定输出文件名

### 功能文档都可选的指令

* list 对应功能的列表
  类型: 对象列表

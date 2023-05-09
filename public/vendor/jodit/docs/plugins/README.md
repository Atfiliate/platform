# How create Jodit plugin
```ts
class pluginName extends Jodit.modules.Plugin {
  afterInit(jodit: IJodit) {
  }

  beforeDestruct(jodit: IJodit) {
  }
}
```
and register plugin in plugin system
```ts
Jodit.plugins.add('plugin-name', pluginName);
```

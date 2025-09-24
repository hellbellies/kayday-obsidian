# Development Cycle

## Develop

```shell
npm run dev
```

## Release

Source: https://docs.obsidian.md/Plugins/Releasing/Release+your+plugin+with+GitHub+Actions

Assuming you are on version 1.0.1

1. change the version in `manifest.json`

2. add a tag (note, the relase name `-m` bust match the version and tag)

```shell
git tag -a 1.0.1 -m "1.0.1"
git push origin 1.0.1
```

3. Browse to the repo on GitHub, open the Actions tab.

4. When the workflow is finished head to the main page for your repo and select 'Releases' in the sidebar. The workflow has drafted a **draf** release (and uploaded the required assets)

5. Select **Edit**, add release notes, **Publish release**

# Backup Jodit plugin

Save editing contents of different Jodit instances on different pages in local or remote storage.

It will protect you from:

* Mistake editions
* Accidentally unsaved and closed document
* Network fails
* It stores full history of your editions on your computer and you can restore it at any time you need.

The saving of contents may be:

* Manual
* Automatically: with a configurable interval and snapshots limit, plugin understands duplicates and omits them

The plugin shows you full featured preview when you choose a snapshot to restore.

## Options

### backup.interval = 30

The interval in seconds to make new snapshot.

### backup.limit = 50

The maximum number of snapshots made my the Backup plugin.
If limit is exhausted the plugin removed the last backup before creating new.

### backup.formatDate[(timestamp: string | Date) => string]

If set it should parse `ISnapshotItem.created` and return a formatted timestamp to display in the left-hand list.

```js
const jodit = Jodit.make('#editor', {
    backup: {
        formatDate(date) {
            return (new Date(date)).toDateString();
        }
    }
});
```

### backup.dialogWidth = 700

Default dialog width.

### backup.remoteStore

Interface `ISnaphotStorage` for saving your snapshots inside another storage (ex. remote rest API).

```typescript
interface ISnapshotItem {
    created: Date;
    html: string;
}

interface ISnapshotStorage {
    add(item: ISnapshotItem): Promise<boolean>;
    items(): Promise<ISnapshotItem[]>;
    clear(): Promise<boolean>;
}
```

Example:
```js
class RemoteSnaphotSorage {
    remoteUrl = 'https://someapi.com/save.php';

    async add(item) {
        await fetch(this.remoteUrl, {
            method: 'POST',
            body: JSON.stringify(item)
        });
        return true;
    }

    async clear() {
        await fetch(this.remoteUrl + '?all', {
            method: 'DELETE'
        });
    }

    items() {
       return fetch(this.remoteUrl, {
           method: 'GET'
       }).then(resp => resp.json());
    }
}

const jodit = Jodit.make('#editor', {
    backup: {
        interval: 20,
        limit: Infinity,
        remoteStore: new RemoteSnaphotSorage()
    }
});
```

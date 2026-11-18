'use strict';

function clone(v) {
	if (v instanceof Date) return new Date(v.getTime());
	if (Array.isArray(v)) return v.map(clone);
	if (v && typeof v === 'object') {
		var out = {};
		Object.keys(v).forEach(function(k) {
			out[k] = clone(v[k]);
		});
		return out;
	}
	return v;
}

function createMockDb(initial) {
	var store = {};
	Object.keys(initial || {}).forEach(function(k) {
		store[k] = clone(initial[k]);
	});

	function write(path, data, opts) {
		if (opts && opts.merge && Object.prototype.hasOwnProperty.call(store, path)) {
			var base = clone(store[path]);
			var patch = clone(data);
			Object.keys(patch).forEach(function(k) {
				base[k] = patch[k];
			});
			store[path] = base;
		} else {
			store[path] = clone(data);
		}
	}

	function snap(path) {
		if (!Object.prototype.hasOwnProperty.call(store, path))
			return { exists: false, id: path.split('/').pop(), data: function() { return undefined; } };
		return {
			exists: true,
			id: path.split('/').pop(),
			data: function() { return clone(store[path]); }
		};
	}

	function ref(path) {
		return {
			path: path,
			get: function() { return Promise.resolve(snap(path)); },
			set: function(data, opts) {
				write(path, data, opts);
				return Promise.resolve();
			}
		};
	}

	return {
		_store: store,
		doc: function(path) { return ref(path); },
		runTransaction: function(fn) {
			var t = {
				get: function(r) { return Promise.resolve(snap(r.path)); },
				set: function(r, data, opts) { write(r.path, data, opts); }
			};
			return Promise.resolve().then(function() { return fn(t); });
		}
	};
}

module.exports = { createMockDb };

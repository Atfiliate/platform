Array.prototype.flat = function(col, placeholder){
	return this.map(function(i){
		return i[col] === undefined ? placeholder : i[col];
	})
}
Array.prototype.getUnique = function() {
	var u = {undefined:1},
		a = [];
	for (var i = 0, l = this.length; i < l; ++i) {
		if (u.hasOwnProperty(this[i]))
			continue;
		a.push(this[i]);
		u[this[i]] = 1;
	}
	return a;
}
Array.prototype.unique = function(col){
	if(col)
		return this.flat(col).getUnique();
	else
		return this.getUnique();
}

Array.prototype.shuffle = function() {
	var i = this.length,
		j, temp;
	if (i == 0) return this;
	while (--i) {
		j = Math.floor(Math.random() * (i + 1));
		temp = this[i];
		this[i] = this[j];
		this[j] = temp;
	}
	return this;
}
Array.prototype.max = function() {
	return Math.max.apply(null, this);
};

Array.prototype.min = function() {
	return Math.min.apply(null, this);
};


String.prototype.toCamelCase = function() {
	var str = this.replace(/\s(.)/g, function($1) { return $1.toUpperCase(); })
		.replace(/\s/g, '')
		.replace(/^(.)/, function($1) { return $1.toLowerCase(); })
	return str.replace(/\W/g, '')
}
String.prototype.hashCode = function() {
	var hash = 0, i, chr;
	if (this.length === 0) return hash;
	for (i = 0; i < this.length; i++) {
		chr   = this.charCodeAt(i);
		hash  = ((hash << 5) - hash) + chr;
		hash |= 0; // Convert to 32bit integer
	}
	return hash;
};


function pathValue(obj, path, val){
	path = typeof path == 'string' ? path.split('[').join('.').split('.') : path;
	var attr = path.shift();
	if(attr && attr.indexOf(']') != -1)
		attr = attr.replace('[', '').replace(']', '');
	if(val != undefined){
		if(path.length){
			if(obj[attr]){
				pathValue(obj[attr], path, val)
			}else{
				obj[attr] = {};
				pathValue(obj[attr], path, val)
			}
		}else if(val == '_delete_'){
			delete obj[attr];
		}else{
			 obj[attr] = val;
		}
	}else{
		if(attr)
			if(obj)
				return pathValue(obj[attr], path);
			else
				return undefined;
		else
			return obj;
	}
}

function elementPath(el) {
	var names = [];
	while (el.parentNode) {
		if (el.id) {
			names.unshift('#' + el.id);
			break;
		}
		else {
			if (el == el.ownerDocument.documentElement) names.unshift(el.tagName);
			else {
				for (var c = 1, e = el; e.previousElementSibling; e = e.previousElementSibling, c++);
				names.unshift(el.tagName + ":nth-child(" + c + ")");
			}
			el = el.parentNode;
		}
	}
	return names.join(" > ");
}
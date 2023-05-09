/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

/* eslint-disable tsdoc/syntax */

/**
 * Validate license
 * @param {string} code
 * @param {string} domain
 * @return {boolean}
 */
function validateLicense(code, domain) {
	if (validateEntLicense(code)) {
		return true;
	}

	// For local and testing stages
	if (/(test|localhost)/.test(domain)) {
		return true;
	}

	const domainsParts = domainsHash(domain);

	const parts = [
		'[A-F013456][A-F0-9]{3}{part}',
		'([0-3]){part}[E-L4-8]{2}\\1',
		'[A-D]{part}[J-P5-6]{3}',
		'{part}[A-R0-9]{3}[X-Z]'
	].map((part, index) => {
		return part.replace('{part}', domainsParts[index] || '[R-T]');
	});

	const reg = RegExp(`^${parts.join('-')}$`, 'i');
	const type = code.substring(12, 13);

	const result = reg.test(code);
	if (!result && type === (typeof !domain).toUpperCase()[5]) {
		const parts = domain.split('.');
		parts.shift();
		return parts.length ? validateLicense(code, parts.join('.')) : false;
	}

	return result;
}

module.exports.validateLicense = validateLicense;

function validateEntLicense(code) {
	return /[A-Z0-9][013456][A-P0-9]{2}[ABC]-([0-3])[ELPDF][E-L4-8]{2}\1-[A-D][R0][J-P5-6]{3}-[DPGHYE][GFPOD]{3}[A-SX-Z]/.test(
		code
	);
}

module.exports.validateEntLicense = validateEntLicense;

function domainsHash(domain) {
	const domains = domain.split('.');

	return domains
		.map((p) => {
			if (p[0] && p[0].charCodeAt(0)) {
				return String.fromCharCode(p[0].charCodeAt(0) + 1);
			}

			return p[0];
		})
		.concat(
			domains.map((p) => {
				if (p[p.length - 1] && p[p.length - 1].charCodeAt(0)) {
					return String.fromCharCode(
						p[p.length - 1].charCodeAt(0) - 1
					);
				}

				return p[p.length - 1];
			})
		);
}

module.exports.domainsHash = domainsHash;

editAi = {
	meta: {
		name:			"editAi",
		version:		"2.1",
		title:			"Edit AI",
		description:	"AI insights for Ace Editor with Ctrl+Enter submission.",
		url:			"/core/editAi.js"
	},

	// _systemInstructions: `Create a condense schema that represents this code - in a way that it can be quickly understood by AI engines - tools, function calls, relationships.`,
	_systemInstructions: `You are a senior code reviewer. Return STRICT JSON only.

Review the code for bugs, security risks, maintainability issues, and important architectural observations. 
Ignore stylistic preferences unless they affect correctness or maintainability.

If userRequest exists, address it first in evaluation.
If userSelection exists, prioritize that code while noting severe surrounding issues.

OUTPUT JSON FORMAT:

{
	"title": string,
	"summary": string (markdown),
	"evaluation": string (markdown),
	"suggestions": [
		{
			"title": string,
			"line": number,
			"insert": "before" | "after" | "replace",
			"severity": "low" | "medium" | "high",
			"codeBlock": string,
			"newCode": string,
			"shortExplanation": string
		}
	],
	"globalReferences": [string]
}

FIELD RULES
- summary: short paragraph describing what the code does.
- evaluation: high-level assessment only. Do NOT place edit instructions or replacement code here.
- suggestions: actionable improvements only.

SUGGESTION RULES
- Every suggestion must include shortExplanation.
- codeBlock must be an exact excerpt copied from the source code. Do not use placeholders like "..." or paraphrased snippets.
- newCode must be directly insertable/replacement code, not advice in comment form, except for the line 0 globals comment.
- Do not create suggestions for speculative issues unless tied to a specific codeBlock.
- Do not include built-in globals like window or document in globalReferences unless they are important to document for this file.

GLOBAL REFERENCES
If identifiers appear externally provided (framework/global variables), add them to globalReferences.
If globalReferences is non-empty, the FIRST suggestion must insert a comment at line 0 listing those globals.

CONSTRAINTS
- suggestions must contain all code-change recommendations.
- evaluation must not contain edits.
- Return JSON only (no markdown fences).

GLOBAL REFERENCES
If a variable appears undefined in this file but may be provided globally (framework, runtime, injected dependency), add it to globalReferences.
If globalReferences is not empty:
- The FIRST suggestion must insert a comment at line 0 listing the globals.
- newCode must be a comment containing those identifiers.`,

	_feedback: "",
	_userInput: "",
	_isProcessing: false,
	_firstLoad: true,

	init: () => {
		api.register("edit-sideFeature", {
			title:		"Edit AI",
			idx:		-1,
			template:	"/core/editAi.side"
		});
		api.register("edit-settings", {
			title:		"Edit AI",
			template:	"/core/editAi.settings"
		});

		api.on('edit.tab', (tab)=>{
			editAi.evaluate(tab);
		});
	},

	insight: (tab) => {
		editAi.evaluate(tab);
	},

	normalizeSnippet: (str) => {
		return `${str || ''}`
			.replace(/\r\n/g, '\n')
			.replace(/\r/g, '\n')
			.replace(/\t/g, '    ')
			.replace(/[ \u00A0]+$/gm, '')
			.trim();
	},

	findLineByCodeBlock: (source, codeBlock, fallbackLine = 0) => {
		source = `${source || ''}`.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
		codeBlock = `${codeBlock || ''}`.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

		if(!codeBlock.trim())
			return typeof fallbackLine == 'number' ? fallbackLine : 0;

		let exactIdx = source.indexOf(codeBlock);
		if(exactIdx > -1)
			return source.substring(0, exactIdx).split('\n').length - 1;

		let sourceLines = source.split('\n');
		let blockLines = codeBlock.split('\n');

		let normalizedBlockLines = blockLines.map(editAi.normalizeSnippet).filter(Boolean);
		if(!normalizedBlockLines.length)
			return typeof fallbackLine == 'number' ? fallbackLine : 0;

		let best = {
			line: typeof fallbackLine == 'number' ? fallbackLine : 0,
			score: 0
		};

		for(let i = 0; i < sourceLines.length; i++){
			let matched = 0;

			for(let j = 0; j < normalizedBlockLines.length; j++){
				let sLine = sourceLines[i + j];
				if(typeof sLine == 'undefined')
					break;

				let normSourceLine = editAi.normalizeSnippet(sLine);
				let normBlockLine = normalizedBlockLines[j];

				if(!normBlockLine)
					continue;

				if(normSourceLine === normBlockLine)
					matched++;
				else
					break;
			}

			if(matched > best.score){
				best.line = i;
				best.score = matched;

				if(matched === normalizedBlockLines.length)
					return i;
			}
		}

		if(normalizedBlockLines.length >= 2 && best.score >= Math.min(2, normalizedBlockLines.length))
			return best.line;

		let compactSource = source.replace(/[ \t]+/g, ' ');
		let compactBlock = codeBlock.replace(/[ \t]+/g, ' ').trim();
		let compactIdx = compactSource.indexOf(compactBlock);

		if(compactIdx > -1)
			return compactSource.substring(0, compactIdx).split('\n').length - 1;

		return typeof fallbackLine == 'number' ? fallbackLine : 0;
	},

	compileInsights: (feedback, source) => {
		let suggestions = pathValue(feedback, 'suggestions') || [];

		return suggestions.map((item, idx) => {
			let row = editAi.findLineByCodeBlock(source, item.codeBlock, item.line || 0);
			let severity = item.severity || 'low';

			let typeMap = {
				low:		'info',
				medium:		'warning',
				high:		'error'
			};

			let labelMap = {
				low:		'AI Suggestion',
				medium:		'AI Warning',
				high:		'AI Risk'
			};

			return {
				id:			`ai-${idx}-${row}`,
				row:		row,
				line:		row,
				type:		typeMap[severity] || 'warning',
				label:		labelMap[severity] || 'AI Suggestion',
				title:		item.title || 'Suggestion',
				text:		item.shortExplanation || item.title || 'AI suggestion',
				insert:		item.insert || 'replace',
				severity:	severity,
				codeBlock:	item.codeBlock || '',
				newCode:	item.newCode || '',
				ai:			item,
				html: `
					<div class="ace-ai-insight">
						<div><strong>${item.title || 'Suggestion'}</strong></div>
						<div>${item.shortExplanation || ''}</div>
						<div style="margin-top:8px;">
							<md-button class="md-primary md-raised" ng-click="editAi.applyInsight(item)">Insert</md-button>
						</div>
					</div>
				`
			};
		});
	},

	applyInsight: (insight) => {
		let editor = $scope.editor;
		if(!editor || !insight)
			return;

		let session = editor.session;
		let Range = ace.require('ace/range').Range;
		let line = editAi.findLineByCodeBlock(editor.getValue(), insight.codeBlock, insight.line || 0);
		let insert = insight.insert || 'replace';
		let newCode = insight.newCode || '';

		if(line === 0 && !insight.codeBlock && insert == 'before'){
			session.insert({row: 0, column: 0}, newCode + '\n');
			return;
		}

		let lines = session.getDocument().getAllLines();
		let codeLines = `${insight.codeBlock || ''}`.replace(/\r\n/g, '\n').split('\n');
		let startRow = line;
		let endRow = Math.min(line + codeLines.length - 1, lines.length - 1);

		if(insert == 'before'){
			session.insert({row: startRow, column: 0}, newCode + '\n');
		}else if(insert == 'after'){
			session.insert({row: endRow + 1, column: 0}, newCode + '\n');
		}else{
			let endColumn = (lines[endRow] || '').length;
			session.replace(new Range(startRow, 0, endRow, endColumn), newCode);
		}
	},

	evaluate: (tab, isSelectionEvent) => {
		if (!editAi.$insightOn || editAi._isProcessing) return;

		const editor = $scope.editor;
		if (!editor) return;

		editAi.setupSelectionListener(editor, tab);

		const code = editor.getValue();
		const selection = editor.getSelectedText();
		const customQuery = editAi._userInput;

		let instructions = editAi._systemInstructions;
		let prompt = '';

		if (editAi._firstLoad && !isSelectionEvent && !customQuery) {
			prompt = `Full Document:\n${code}`;
			editAi._firstLoad = false;
		} else if (customQuery || isSelectionEvent) {
			if (customQuery) prompt += `User Request: ${customQuery}\n\n`;
			if (selection) prompt += `User Selection:\n${selection}\n\n`;
			prompt += `Full Document:\n${code}`;
		} else {
			return;
		}

		editAi._isProcessing = true;
		$http.post('https://a.alphabetize.us/project/code/cloud/gpt', { instructions, prompt }).then(({ data }) => {
			try{
				editAi._feedback = JSON.parse(pathValue(data.result, 'output[0].content[0].text'));

				let insights = editAi.compileInsights(editAi._feedback, code);
				if(editor.insights && editor.insights.set)
					editor.insights.set(insights);

			}catch(e){
				console.error(e);
				editAi._feedback = {suggestion: 'Try again. Feedback returned with the wrong format.'};
			}
		}).catch(e => {
			console.error(e);
			editAi._feedback = {suggestion: 'Request failed.'};
		}).finally(() => {
			editAi._isProcessing = false;
		});
	},

	setupSelectionListener: (editor, tab) => {
		if (editor._editAiBound) return;
		editor.on("changeSelection", () => {
			const selection = editor.getSelectedText();
			if (selection && selection.trim().length > 10) {
				if (editAi._selectTimer) clearTimeout(editAi._selectTimer);
				editAi._selectTimer = setTimeout(() => {
					if (editAi.$insightOn) editAi.evaluate(tab, true);
				}, 1200);
			}
		});
		editor._editAiBound = true;
	}
};


















// editAi = {
// 	meta: {
// 		name:			"editAi",
// 		version:		"2.1",
// 		title:			"Edit AI",
// 		description:	"AI insights for Ace Editor with Ctrl+Enter submission.",
// 		url:			"/core/editAi.js"
// 	},
// 	_systemInstructions: `You are a senior code reviewer. Return STRICT JSON only.

// Review the code for bugs, security risks, maintainability issues, and important architectural observations. 
// Ignore stylistic preferences unless they affect correctness or maintainability.

// If userRequest exists, address it first in evaluation.
// If userSelection exists, prioritize that code while noting severe surrounding issues.

// OUTPUT JSON FORMAT:

// {
// 	"title": string,
// 	"summary": string,
// 	"evaluation": string,
// 	"suggestions": [
// 		{
// 			"title": string,
// 			"line": number,
// 			"insert": "before" | "after" | "replace",
// 			"severity": "low" | "medium" | "high",
// 			"codeBlock": string,
// 			"newCode": string,
// 			"shortExplanation": string
// 		}
// 	],
// 	"globalReferences": [string]
// }

// FIELD RULES
// - summary: short paragraph describing what the code does.
// - evaluation: high-level assessment only. Do NOT place edit instructions or replacement code here.
// - suggestions: actionable improvements only.

// SUGGESTION RULES
// - Every suggestion must include shortExplanation.
// - codeBlock must be an exact excerpt copied from the source code. Do not use placeholders like "..." or paraphrased snippets.
// - newCode must be directly insertable/replacement code, not advice in comment form, except for the line 0 globals comment.
// - Do not create suggestions for speculative issues unless tied to a specific codeBlock.
// - Do not include built-in globals like window or document in globalReferences unless they are important to document for this file.

// GLOBAL REFERENCES
// If identifiers appear externally provided (framework/global variables), add them to globalReferences.
// If globalReferences is non-empty, the FIRST suggestion must insert a comment at line 0 listing those globals.

// CONSTRAINTS
// - suggestions must contain all code-change recommendations.
// - evaluation must not contain edits.
// - Return JSON only (no markdown fences).

// GLOBAL REFERENCES
// If a variable appears undefined in this file but may be provided globally (framework, runtime, injected dependency), add it to globalReferences.
// If globalReferences is not empty:
// - The FIRST suggestion must insert a comment at line 0 listing the globals.
// - newCode must be a comment containing those identifiers.`,
// 	// _systemInstructions: `As a lead developer, you need to determine what parts of this code pose a security risk or bug, and what to ignore. 
// 	// 	1. If any variables may seem undefined, declare them in globalReferences, and add to the suggestions array as a suggestion to create a line indicating those variables in a comment on line 0.
// 	// 	2. Determine what patterns are being used, and what the objective of this code is. (summary)
// 	// 	3. Make suggestions for how to improve it.  Note, excess code creates technical debt - so don't create excess code.  If it is fine, leave it alone.
// 	// 	If user request is present, address that at the beginning of your evaluation.
// 	// 	If user selection is present, focus your evaluation on that selected part of the document.
// 	// 	summary and evaluation should both be markdown.
// 	// 	Your json response should look like this:
// 	// 	{title, summary, evaluation, suggestions: [{codeBlock, newCode, shortExplanation, line}], globalReferences: []}`,
// 	_feedback: "",      
// 	_userInput: "",     
// 	_isProcessing: false,
// 	_firstLoad: true,

// 	init: () => {
// 		api.register("edit-sideFeature", {
// 			title:		"Edit AI",
// 			idx:		-1,
// 			template:	"/core/editAi.side"
// 		});
// 		api.register("edit-settings", {
// 			title:		"Edit AI",
// 			template:	"/core/editAi.settings"
// 		});
		
// 		api.on('edit.tab', (tab)=>{
// 			editAi.evaluate(tab);
// 		});
// 	},

// 	insight: (tab) => {
// 		editAi.evaluate(tab);
// 	},

// 	evaluate: (tab, isSelectionEvent) => {
// 		if (!editAi.$insightOn || editAi._isProcessing) return;

// 		const editor = $scope.editor;
// 		if (!editor) return;

// 		editAi.setupSelectionListener(editor, tab);

// 		const code = editor.getValue();
// 		const selection = editor.getSelectedText(); 
// 		const customQuery = editAi._userInput;

// 		let instructions = editAi._systemInstructions;
// 		let prompt = '';

// 		if (editAi._firstLoad && !isSelectionEvent && !customQuery) {
// 			prompt = `Full Document:\n${code}`;
// 			editAi._firstLoad = false;
// 		} else if (customQuery || isSelectionEvent) {
// 			if (customQuery) prompt += `User Request: ${customQuery}\n\n`;
// 			if (selection) prompt += `User Selection:\n${selection}\n\n`;
// 			prompt += `Full Document:\n${code}`;
// 		} else {
// 			return; 
// 		}

// 		editAi._isProcessing = true;
// 		$http.post('https://a.alphabetize.us/project/code/cloud/gpt', { instructions, prompt }).then(({ data }) => {
// 			try{
// 				editAi._feedback = JSON.parse(pathValue(data.result, 'output[0].content[0].text'));
// 			}catch(e){
// 				editAi._feedback = {suggestion: 'Try again.  Feedback returned with the wrong format.'}
// 			}
// 			// if (customQuery) editAi._userInput = ""; 
// 		}).catch(e => {
// 			console.error(e);
// 			editAi._feedback = {suggestion: 'Request failed.'}
// 		}).finally(() => {
// 			editAi._isProcessing = false;
// 		});
// 	},

// 	setupSelectionListener: (editor, tab) => {
// 		if (editor._editAiBound) return;
// 		editor.on("changeSelection", () => {
// 			const selection = editor.getSelectedText();
// 			if (selection && selection.trim().length > 10) { // Slight increase to filter accidental drags
// 				if (editAi._selectTimer) clearTimeout(editAi._selectTimer);
// 				editAi._selectTimer = setTimeout(() => {
// 					if (editAi.$insightOn) editAi.evaluate(tab, true);
// 				}, 1200); 
// 			}
// 		});
// 		editor._editAiBound = true;
// 	}
// };


























// editAi = {
// 	meta: {
// 		name:			"editAi",
// 		version:		"1.5",
// 		title:			"Edit AI",
// 		description:	"Add AI to editing of site projects.",
// 		url:			"/core/editAi.js"
// 	},
// 	init: ()=>{
// 		editAi.instructions.load();
		
// 		api.register("edit-sideFeature", {
// 			title:		"Edit AI",
// 			idx:		-1,
// 			template:	"/core/editAi.side"
// 		});
// 		api.register("edit-settings", {
// 			title:		"Edit AI",
// 			template:	"/core/editAi.settings"
// 		});
		
// 		api.on('edit.tab', (tab)=>{
// 			editAi.evaluate(tab);
// 		});
// 	},
// 	insight: (tab)=>{
// 		editAi.evaluate(tab);
// 	},
// 	instructions: {
// 		load: ()=>{
// 			return new Fire('dev/ai/instructions').where('enabled','==',true).get().then($instructions=>{
// 				editAi.$instructions = $instructions;
// 				if($instructions.length==0)
// 					editAi.instructions.seed($instructions);
				
// 				return editAi.$instructions;
// 			}).catch(e=>{
// 				console.error('AI instructions load error', e);
// 				editAi.$instructions = [];
// 				return [];
// 			});
// 		},
// 		seed: ($instructions)=>{
// 			tools.alert('First time AI use detected - seeding AI instructions.')
// 			editAi.seededInstructions.forEach($instructions.$fire.add)
// 		},
// 		build: (tab)=>{
// 			let area = tab;
// 			let instructions = editAi.$instructions.filter(row=>{
// 				return row.areas.includes(area) || row.areas.includes('general');
// 			}).sort((a, b)=>(a.order || 0) - (b.order || 0));
			
// 			instructions = instructions.map(instruction=>{
// 				return `# ${instruction.title}\n${instruction.text}`;
// 			}).join('\n\n');
// 			return instructions;
// 		},
// 	},
// 	code: {
// 		prompt: (tab, code)=>{
// 			let area = tab;
// 			let context = JSON.stringify({
// 				area,
// 			})
			
// 			let instructions = `
// 				Evaluate the code and respond in JSON.
// 				${editAi.instructions.build(tab)}
// 			`;
			
// 			let prompt = `
// 				Context: 
// 					${context}
					
// 				Code: 
// 					${code}
// 			`
			
// 			return {instructions, prompt}
// 		}
// 	},
// 	evaluate: (tab)=>{
// 		if(!editAi.$insightOn)
// 			return;
		
// 		let area = tab;
// 		let code = $scope.editor && $scope.editor.getValue ? $scope.editor.getValue() : '';
		
// 		let {instructions, prompt} = editAi.code.prompt(tab, code);
		
// 		$http.post('https://a.alphabetize.us/project/code/cloud/gpt', {instructions,prompt}).then(({data})=>{
// 			editAi._results = data.result || {};
// 			try{
// 				editAi._insight = JSON.parse(pathValue(editAi._results, 'output[0].content[0].text'));
				
// 				let insights = editAi._insight.errors.map(e=>{
// 					return {
// 						ai: 	e,
// 						row:	e.lineStart,
// 						type:	'warning',
// 						label:	'AI Suggestion',
// 						text:	e.solution,
// 						html:	`<p>${e.solution}</p>
// 									<md-button ng-click="tools.alert(item.ai.solutionCode)">Apply</md-button>`
// 					}
// 				})
// 				console.log({insights})
// 				$scope.editor.insights.set(insights);
// 			}catch(e){
// 				tools.alert('Insights were not of JSON format.')
// 			}
// 		}).catch(e=>{
// 			console.error(e);
// 			tools.alert('Error');
// 		});
// 	},
	
	
	
	
	
	
	
// seededInstructions: [
// {
// 	title: "JSON Response Format",
// 	order: 10,
// 	enabled: true,
// 	areas: ["html","js","component","cloud"],
// 	text: `
// Respond with valid JSON only.
// Do not include markdown or code fences.
// Do not include text before or after the JSON.

// Return exactly this structure:

// {
// 	"codeSummary": "Short description of what this code does",
// 	"codeType": "javascript|html|component|cloud|css|json|unknown",
// 	"inquiry": [
// 		"Questions about missing context"
// 	],
// 	"errors": [
// 		{
// 			"lineStart": 0,
// 			"lineEnd": 0,
// 			"pathToParentFunction": "object.function.subfunction",
// 			"description": "What is wrong or risky",
// 			"severity": 1,
// 			"solution": "Explanation of what should change",
// 			"solutionCode": "corrected code snippet only"
// 		}
// 	]
// }
// `.trim()
// },

// {
// 	title: "Severity Scale",
// 	order: 20,
// 	enabled: true,
// 	areas: ["html","js","component","cloud"],
// 	text: `
// Severity levels:

// 1 = informational suggestion
// 2 = minor improvement
// 3 = moderate issue worth fixing
// 4 = significant problem likely to cause issues
// 5 = critical runtime bug or security problem
// `.trim()
// },

// {
// 	title: "Issue Quality Filter",
// 	order: 30,
// 	enabled: true,
// 	areas: ["html","js","component","cloud"],
// 	text: `
// Only report issues that would realistically lead to a code change.

// Do NOT report:
// - stylistic preferences
// - repeated observations
// - architecture opinions without concrete impact
// - generic best-practice commentary

// If uncertain whether something is an issue, place it in "inquiry" instead of "errors".

// Maximum 5 errors.
// `.trim()
// },

// {
// 	title: "Evidence Requirement",
// 	order: 40,
// 	enabled: true,
// 	areas: ["html","js","component","cloud"],
// 	text: `
// Every error must be supported by evidence in the provided code.

// If the problem cannot be clearly tied to the code, do not report it.
// `.trim()
// },

// {
// 	title: "Solution Guidance",
// 	order: 50,
// 	enabled: true,
// 	areas: ["html","js","component","cloud"],
// 	text: `
// Each error must include a practical solution.

// The solution should explain what needs to change.

// solutionCode should only contain the corrected snippet,
// not the full file and not explanatory comments.
// `.trim()
// },

// {
// 	title: "Cloud Runtime Environment",
// 	order: 100,
// 	enabled: true,
// 	areas: ["cloud"],
// 	text: `
// This code runs in a custom cloud runtime.

// Important environment rules:

// - request and response are available in scope
// - cloud files are self-contained modules
// - dynamic action routing is intentional
// - promises are preferred over async/await

// Do NOT flag these patterns as issues unless they are clearly broken.
// `.trim()
// },

// {
// 	title: "Component Context Rules",
// 	order: 110,
// 	enabled: true,
// 	areas: ["component"],
// 	text: `
// Component code may depend on shared project helpers and globals.

// Do not assume the component is standalone unless the code indicates that it must be.

// Focus on real UI logic issues, maintainability risks, and broken bindings.
// `.trim()
// },

// {
// 	title: "HTML Template Rules",
// 	order: 120,
// 	enabled: true,
// 	areas: ["html"],
// 	text: `
// HTML templates may include AngularJS expressions and directives.

// Do not flag Angular bindings or directives as invalid HTML.

// Focus on:
// - broken bindings
// - accessibility problems
// - invalid markup
// - layout or rendering risks
// `.trim()
// },

// {
// 	title: "Client JavaScript Context",
// 	order: 130,
// 	enabled: true,
// 	areas: ["js"],
// 	text: `
// This is project-level client-side JavaScript.

// It may rely on shared project helpers and global utilities.

// Do not assume Node.js APIs or server runtime unless clearly present.
// `.trim()
// },

// {
// 	title: "Inquiry Guidance",
// 	order: 200,
// 	enabled: true,
// 	areas: ["html","js","component","cloud"],
// 	text: `
// Use the inquiry section for questions about missing context.

// Examples include:
// - runtime assumptions
// - unknown helper functions
// - unclear data structures
// - external dependencies
// `.trim()
// }
// ]
// }
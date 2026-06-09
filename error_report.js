import { browser, browser_version, browser_fallback } from './browser.js';

export async function init(handler){
	let reporting = false, browser_data = browser_fallback();
	try{
		browser_data = await browser();
	}
	catch{}
	
	async function report(message, file, line, column, error, type='Error'){
		if(reporting) return;
		
		const stack = error?.stack || '', origin = file || stack;
		if(origin && !is_local_error(file, stack)) return;
		
		reporting = true;
		
		try{
			const url = window.location.href;
			await handler({
				url,
				type,
				file: file_location(file, line, column),
				error: message || null,
				stack: error?.stack || null,
				browser: browser_version(browser_data),
				user_agent: browser_data.ua
			});
		}
		catch(e){
			console.error('Error report failed:', e);
		}
		finally{
			reporting = false;
		}
	};
	
	window.onerror = (message, file, line, column, error)=>{
		void report(message, file, line, column, error, 'Runtime Error');
	};
	
	window.onunhandledrejection = e=>{
		const reason = e.reason || null;
		void report(
			reason?.message || reason,
			null,
			null,
			null,
			reason instanceof Error ? reason : null,
			'Promise Rejection'
		);
	};
}

function is_local_error(file, stack){
	if(!file && !stack) return true;
	
	const domain = root_domain(location.hostname);
	if(file){
		try{
			const url = new URL(file, location.href);
			if(domain === root_domain(url.hostname)) return true;
		}
		catch{}
	}
	if(stack){
		if(stack.includes('iabjs://') || stack.includes('-extension://')) return false;
		if(stack.includes(domain)) return true;
	}
	return false;
}

function root_domain(hostname){
	return hostname.split('.').slice(-2).join('.');
}

function file_location(file, line, column){
	if(!file) return null;
	return `${file}:${line ?? 'undefined'}:${column ?? 'undefined'}`;
}
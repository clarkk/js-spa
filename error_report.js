export async function init(handler){
	let reporting = false;
	
	async function report(message, file, line, column, error, type='Error'){
		if(reporting) return;
		reporting = true;
		
		try{
			const url = window.location.href, data = await browser();
			handler({
				url,
				type,
				file: file_location(file, line, column),
				error: message || null,
				stack: error?.stack || null,
				browser: browser_version(data),
				user_agent: data.ua
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
		report(message, file, line, column, error, 'Runtime Error');
	};
	
	window.onunhandledrejection = e=>{
		const reason = e.reason || null;
		report(
			reason?.message || reason,
			null,
			null,
			null,
			reason instanceof Error ? reason : null,
			'Promise Rejection'
		);
	};
}

async function browser(){
	let data = {
		ua: navigator.userAgent,
		name: null,
		version: null,
		os: null
	};
	
	if(navigator.userAgentData){
		try {
			const high_entropy = await navigator.userAgentData.getHighEntropyValues([
				'fullVersionList', 'platform', 'platformVersion'
			]);
			
			const specific = high_entropy.fullVersionList.find(filter_browser) || high_entropy.fullVersionList[0];
			
			data.name = specific.brand;
			data.version = specific.version;
			data.os = high_entropy.platform+' '+high_entropy.platformVersion;
		}
		catch(e){
			const basic = navigator.userAgentData.brands.find(filter_browser) || navigator.userAgentData.brands[0];
			data.name = basic.brand;
			data.version = basic.version;
		}
	}
	else{
		if(data.ua.includes('Firefox/')){
			data.name = 'Firefox';
			data.version = data.ua.split('Firefox/')[1]?.split(' ')[0] || null;
		}
		else if(data.ua.includes('Safari/') && !data.ua.includes('Chrome')){
			data.name = 'Safari';
			data.version = data.ua.split('Version/')[1]?.split(' ')[0] || null;
		}
	}
	
	return data;
}

function browser_version(data){
	if(!data.name) return null;
	return [
		data.name,
		data.version,
		data.os
	].filter(Boolean).join(' ');
}

function file_location(file, line, column){
	if(!file) return null;
	return `${file}:${line ?? 'undefined'}:${column ?? 'undefined'}`;
}

function filter_browser(v){
	return v.brand !== 'Chromium' && !v.brand.includes('Not');
}
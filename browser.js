export async function browser(){
	const data = browser_fallback(), ua = navigator.userAgentData;
	
	if(ua){
		try{
			const high_entropy = await ua.getHighEntropyValues(['fullVersionList', 'platform', 'platformVersion']);
			const specific = high_entropy.fullVersionList?.find(filter_browser) ?? high_entropy.fullVersionList?.[0] ?? {};
			data.name = specific.brand ?? null;
			data.version = specific.version ?? null;
			if(high_entropy.platform){
				data.os = [
					high_entropy.platform,
					high_entropy.platformVersion
				].filter(Boolean).join(' ');
			}
		}
		catch(e){
			const basic = ua.brands?.find(filter_browser) ?? ua.brands?.[0] ?? {};
			data.name = basic.brand ?? null;
			data.version = basic.version ?? null;
		}
	}
	else{
		if(data.ua.includes('Firefox/')){
			data.name = 'Firefox';
			data.version = data.ua.match(/Firefox\/([\d.]+)/)?.[1] ?? null;
		}
		else if(data.ua.includes('Edg/')){
			data.name = 'Edge';
			data.version = data.ua.match(/Edg\/([\d.]+)/)?.[1] ?? null;
		}
		else if(data.ua.includes('Safari/') && !data.ua.includes('Chrome/') && !data.ua.includes('Chromium/')){
			data.name = 'Safari';
			data.version = data.ua.match(/Version\/([\d.]+)/)?.[1] ?? null;
		}
		else if(data.ua.includes('Chrome/')){
			data.name = 'Chrome';
			data.version = data.ua.match(/Chrome\/([\d.]+)/)?.[1] ?? null;
		}
		
		if(!data.os){
			const ios = data.ua.match(/(?:iPhone|iPad|iPod).*?OS (\d+(?:[_\d]+)?)/i);
			if(ios) data.os = `iOS ${ios[1].replace(/_/g, '.')}`;
		}
		
		if(!data.os){
			const android = data.ua.match(/Android ([\d.]+)/);
			if(android) data.os = `Android ${android[1]}`;
		}
	}
	
	return data;
}

export function browser_version(data){
	if(!data.name) return null;
	return [
		data.name,
		data.version,
		data.os
	].filter(Boolean).join(' ');
}

export function browser_fallback(){
	return {
		ua: navigator.userAgent ?? '',
		name: null,
		version: null,
		os: null
	};
}

function filter_browser(v){
	return v.brand && v.brand !== 'Chromium' && !v.brand.includes('Not');
}
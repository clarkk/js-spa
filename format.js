export function html(s, allow_newline=false){
	if(s == null) return '';
	s = String(s)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
	return allow_newline ? s.replace(/\r\n|\r|\n/g, '<br>') : s;
}

export function amount(s, f=2, thousands=true){
	const [int, dec] = Number(s).toFixed(f).split('.');
	return (thousands ? int.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : int)+','+dec;
}
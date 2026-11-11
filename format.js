export function html(s){
	if(!s) return '';
	return String(s)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
};

export function amount(s, f=2, thousands=true){
	const [int, dec] = Number(s).toFixed(f).split('.');
	return (thousands ? int.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : int)+','+dec;
}
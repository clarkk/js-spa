export function html(s){
	if(!s) return '';
	return String(s)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
};

export function amount(s, f=2){
	const [int, dec] = Number(s).toFixed(f).split('.');
	return int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')+','+dec;
}

export function timestamp(time){
	const n = new Date(time * 1000), day = String(n.getDate()).padStart(2, '0'), month = String(n.getMonth() + 1).padStart(2, '0'), year = n.getFullYear(),
		hour = String(n.getHours()).padStart(2, '0'), min = String(n.getMinutes()).padStart(2, '0');
	return `${day}-${month}-${year} ${hour}:${min}`;
}
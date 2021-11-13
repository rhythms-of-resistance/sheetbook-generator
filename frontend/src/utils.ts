export function showGlobalError(err: Error): void {
	console.error(err);
	document.getElementById('global-error')!.innerText = err.message;
	document.getElementById('global-error')!.style.display = '';
	document.getElementById('loading')?.remove();
	document.querySelector('.rsg-main')?.remove();
}
import * as dom from 'dom';
import * as fmt from 'fmt';
import * as frm from 'frm';

let active = null, position_frame = null, panel = null;

const CLASS_ACTIVE='active', CLASS_SELECTED='selected', PADDING=4;

export function create(store, parent, value){
	let container = null, rendered = false, opened = false, component = null, definition = null;
	const input_select_id = dom.id(), inputs = {
		text: null,
		select: null
	}, o = {
		definition(def){
			if(!arguments.length) return definition;
			
			if(def == null) throw Error('Dropdown definition must be defined');
			if(!rendered) throw Error(`Dropdown is not rendered`);
			
			if(def === definition) return o;
			
			component?.close?.();
			
			definition = def;
			
			component = def === frm.DROPDOWN_CALENDAR ? create_calendar(store, inputs, parent.val, controls) : create_list(store, inputs, parent.val, controls, def, _=>opened);
			component.init(value);
			inputs.text.readOnly = o.select();
			
			if(opened && active?.container === container){
				component.open?.();
				component.render();
				position();
				component.scroll_selected?.();
			}
			
			return o;
		},
		render(elm, input_id){
			if(rendered) throw Error(`Dropdown is already rendered`);
			
			const container_id = dom.id();
			rendered = true;
			elm.innerHTML = `
				<div id="${container_id}" class="field-dropdown">
					<input id="${input_id}" type="text" autocomplete="nope">
					<i class="bi bi-chevron-down field-dropdown-icon"></i>
					<input id="${input_select_id}" type="hidden">
				</div>
			`;
			
			container = document.getElementById(container_id);
			inputs.text = document.getElementById(input_id);
			inputs.select = document.getElementById(input_select_id);
			
			inputs.text.addEventListener('focus', _=>{
				controls.open();
			});
			inputs.text.addEventListener('click', _=>{
				controls.open();
			});
			inputs.text.addEventListener('input', e=>{
				component?.input?.(e);
			});
			return o;
		},
		keydown(e){
			switch(e.key){
			case frm.KEY_ESC:
				if(!opened) return false;
				
				e.preventDefault();
				controls.close();
				return true;
				
			case frm.KEY_ARROW_DOWN:
				e.preventDefault();
				controls.open();
				component.down();
				return true;
				
			case frm.KEY_ARROW_UP:
				e.preventDefault();
				controls.open();
				component.up();
				return true;
				
			case frm.KEY_ENTER:
				if(!opened) return false;
				
				e.preventDefault();
				component.choose();
				controls.close();
				return false;
				
			case frm.KEY_TAB:
				if(!opened) return false;
				
				e.preventDefault();
				component.choose();
				controls.close();
				parent.tab(e);
				return true;
			}
			
			return false;
		},
		select(){
			return !!component?.select?.();
		}
	}, controls = {
		open(){
			if(inputs.text.disabled || opened) return;
			
			if(!component) throw Error('Dropdown definition is not defined');
			
			if(active && active.container !== container) active.close();
			
			opened = true;
			
			component.open?.();
			component.render();
			
			container.classList.add(CLASS_ACTIVE);
			panel.classList.add(CLASS_ACTIVE);
			active = {
				container,
				position,
				close: controls.close
			};
			
			position();
			component.scroll_selected?.();
		},
		close(){
			opened = false;
			
			component.close?.();
			
			if(active?.container === container){	
				container.classList.remove(CLASS_ACTIVE);
				panel?.classList.remove(CLASS_ACTIVE);
				active = null;
			}
		}
	};
	
	function input_val(value){
		if(!arguments.length) return o.select() ? inputs.select.value : inputs.text.value;
		
		if(value !== undefined){
			if(o.select()){
				const option = component.select_option(value);
				inputs.select.value = option.value;
				inputs.text.value = option.text;
			}
			else inputs.text.value = value ?? '';
		}
	}
	
	function position(){
		if(!opened || !inputs.text?.isConnected || !panel?.isConnected) return;
		
		const rect = inputs.text.getBoundingClientRect();
		
		if(rect.bottom <= 0 || rect.top >= window.innerHeight || rect.right <= 0 || rect.left >= window.innerWidth){
			controls.close();
			return;
		}
		
		panel.style.left = rect.left+'px';
		
		const panel_height = panel.offsetHeight, space_below = window.innerHeight - rect.bottom, space_above = rect.top;
		if(space_below >= panel_height || space_below >= space_above) panel.style.top = (rect.bottom + PADDING)+'px';
		else panel.style.top = Math.max(0, rect.top - panel_height - PADDING)+'px';
	}
	
	return {
		api: Object.freeze(o),
		input_val
	};
}

function create_list(store, inputs, field_val, controls, def, is_open){
	let options = [], filtered = [], selected = -1, searching = false, items = null, unsubscribe = null;
	const o = {
		init(value){
			options = def.options(store);
			
			if(o.select()){
				const option = o.select_option(value);
				inputs.text.value = option.text;
				inputs.select.value = option.value;
			}
			else inputs.text.value = value ?? '';
			
			filter();
		},
		render(){
			const panel = get_panel();
			panel.innerHTML = `
				<div class="field-dropdown-header">
					<div class="field-dropdown-label">${store.t(def.label)}</div>
					${o.select() ? '' : `<div class="field-dropdown-count">${filtered.length} / ${options.length}</div>`}
				</div>
				<ul class="field-dropdown-list">
					${filtered.map((option, i)=>`
						<li class="${i === selected ? CLASS_SELECTED : ''}" data-index="${i}">${fmt.html(option.text)}</li>
					`).join('')}
				</ul>
			`;
			items = panel.querySelectorAll('li');
			
			panel.querySelector('.field-dropdown-list').addEventListener('click', e=>{
				const item = e.target.closest('li');
				if(!item) return;
				
				selected = Number(item.dataset.index);
				o.choose();
				inputs.text.focus();
				controls.close();
			});
			
			panel.addEventListener('pointerdown', e=>{
				if(e.target.closest('li')) return;
				
				e.preventDefault();
				e.stopPropagation();
				inputs.text.focus();
			});
			
			return o;
		},
		open(){
			if(inputs.text.disabled || unsubscribe || !def.entries) return;
			
			unsubscribe = store.entries.subscribe(def.entries, _=>{
				if(is_open()){
					options = def.options(store);
					filter();
					o.render();
					o.scroll_selected();
				}
			});
		},
		close(){
			unsubscribe?.();
			unsubscribe = null;
		},
		down(){
			move(1);
		},
		up(){
			move(-1);
		},
		scroll_selected(){
			items?.[selected]?.scrollIntoView({
				block: 'nearest'
			});
		},
		choose(){
			if(selected === -1) return;
			
			field_val(filtered[selected]?.value);
			searching = false;
		},
		input(){
			if(o.select()) return;
			
			controls.open();
			searching = true;
			filter();
			o.render();
		},
		select_option(value){
			return value === undefined ? options[0] : options.find(option=>
				option.value === String(value)
			) ?? options[0];
		},
		select(){
			return !!def.select;
		}
	};
	
	function move(direction){
		if(!filtered.length) return;
		
		const previous = selected;
		selected += direction;
		if(selected < 0) selected = filtered.length - 1;
		else if(selected >= filtered.length) selected = 0;
		
		items[previous]?.classList.remove(CLASS_SELECTED);
		items[selected]?.classList.add(CLASS_SELECTED);
		o.scroll_selected();
	}
	
	function filter(){
		if(o.select() || !searching) filtered = options;
		else{
			const search = inputs.text.value.trim().toLowerCase();
			filtered = options.filter(option=>
				option.search.includes(search)
			);
		}
		if(o.select()){
			selected = filtered.findIndex(option=>
				option.value === inputs.select.value
			);
		}
		else{
			const value = inputs.text.value.trim().toLowerCase();
			selected = value ? filtered.findIndex(option=>
				option.value.toLowerCase() === value
			) : -1;
			if(searching && filtered.length === 1) selected = 0;
		}
	}
	
	return Object.freeze(o);
}

function create_calendar(store, inputs, field_val, controls){
	const o = {
		init(value){
			
		},
		render(){
			const panel = get_panel();
			panel.innerHTML = `
				<div class="field-dropdown-calendar">
					
				</div>
			`;
			return o;
		}
	};
	return Object.freeze(o);
}

function get_panel(){
	if(panel?.isConnected) return panel;
	
	panel = document.createElement('div');
	panel.className = 'field-dropdown-panel';
	document.body.append(panel);
	return panel;
}

document.addEventListener('pointerdown', e=>{
	if(inactivate()) return;
	
	if(active.container.contains(e.target) || panel.contains(e.target)) return;
	
	active.close();
});

document.addEventListener('scroll', schedule_position, true);
window.addEventListener('resize', schedule_position);

function schedule_position(){
	if(!active || position_frame !== null) return;
	
	position_frame = requestAnimationFrame(_=>{
		position_frame = null;
		
		if(inactivate()) return;
		
		active.position();
	});
}

function inactivate(){
	if(!active) return true;
	
	if(!active.container.isConnected || !panel?.isConnected){
		active.close();
		return true;
	}
	
	return false;
}
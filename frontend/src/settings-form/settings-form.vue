<form class="rsg-settings-form" @submit.prevent="submit">
	<fieldset class="row mb-3">
		<legend class="col-form-label col-sm-2 pt-0">Format</legend>
		<div class="col-sm-10">
			<div class="form-check">
				<input class="form-check-input" type="radio" id="rsg-settings-form-booklet-a4" v-model="format" value="booklet-a4"/>
				<label class="form-check-label" for="rsg-settings-form-booklet-a4">A4 booklet</label>
			</div>
			<div class="form-check">
				<input class="form-check-input" type="radio" id="rsg-settings-form-booklet-a5" v-model="format" value="booklet-a5"/>
				<label class="form-check-label" for="rsg-settings-form-booklet-a5">A5 booklet (2 pages per A4 page)</label>
			</div>
			<div class="form-check">
				<input class="form-check-input" type="radio" id="rsg-settings-form-booklet-a6" v-model="format" value="booklet-a6"/>
				<label class="form-check-label" for="rsg-settings-form-booklet-a6">A6 booklet (4 pages per A4 page, 2 booklets per print)</label>
			</div>
			<div class="form-check">
				<input class="form-check-input" type="radio" id="rsg-settings-form-single" v-model="format" value="single"/>
				<label class="form-check-label" for="rsg-settings-form-single">A4 single tune</label>
			</div>
		</div>
	</fieldset>

	<template v-if="format !== 'single'">
		<fieldset class="row mb-3">
			<legend class="col-form-label col-sm-2 pt-0">Tune selection</legend>
			<div class="col-sm-10">
				<div class="form-check">
					<input class="form-check-input" type="radio" id="rsg-settings-form-no-ca" v-model="tuneset" value="no-ca"/>
					<label class="form-check-label" for="rsg-settings-form-no-ca">All tunes (without controversial cultural appropriation tunes)</label>
				</div>
				<div class="form-check">
					<input class="form-check-input" type="radio" id="rsg-settings-form-all" v-model="tuneset" value="all"/>
					<label class="form-check-label" for="rsg-settings-form-all">All tunes</label>
				</div>
				<div class="form-check">
					<input class="form-check-input" type="radio" id="rsg-settings-form-custom" v-model="tuneset" value="custom"/>
					<label class="form-check-label" for="rsg-settings-form-custom">Custom selection</label>
					<template v-if="tuneset === 'custom'">
						&nbsp;
						<a v-if="tunes.length > 0" href="javascript:" @click.prevent="tunes = []">Unselect all</a>
						<a v-if="tunes.length === 0" href="javascript:" @click.prevent="selectAll">Select all</a>
					</template>
				</div>

				<div class="rsg-checkbox-grid mt-4">
					<div v-for="tune in socket.tunesInfo.existingTunes" class="form-check">
						<input class="form-check-input" :id="`rsg-settings-form-tune-${tune.name}`" type="checkbox" :disabled="tuneset !== 'custom'" :value="tune.name" v-model="tunes">
						<label class="form-check-label" :for="`rsg-settings-form-tune-${tune.name}`">{{tune.displayName}}</label>
					</div>
				</div>
			</div>
		</fieldset>
	</template>
	<template v-else>
		<div class="row mb-3">
			<label class="col-form-label col-sm-2" for="rsg-settings-form-tune">Tune</label>
			<div class="col-sm-10">
				<select class="form-select" id="rsg-settings-form-tune" v-model="tune">
					<option v-for="tune in socket.tunesInfo.existingTunes" :value="tune.name">{{tune.displayName}}</option>
				</select>
			</div>
		</div>
	</template>

	<button type="submit" class="btn btn-primary" :disabled="isSubmitting">
		<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true" v-show="isSubmitting"></span>
		Generate
	</button>

	<div class="mt-3 rsg-log" :class="{ showLog }">
		<div ref="terminalRef"></div>
	</div>
</form>
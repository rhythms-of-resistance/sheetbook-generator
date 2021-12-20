<div class="container rsg-main pt-4 pb-4">
	<h1>RoR Sheetbook Generator</h1>
	<p>
		Customize the settings below to generate a RoR sheetbook PDF. The sheetbook will be generated on the fly from the
		latest <a href="https://github.com/rhythms-of-resistance/sheetbook" target="_blank">raw files</a>.
	</p>
	<p>
		The sheets are supposed to be printed on double-sided A4 and can then be bound into booklets.
	</p>
	<hr>
	<SettingsForm :socket="socket"></SettingsForm>
</div>
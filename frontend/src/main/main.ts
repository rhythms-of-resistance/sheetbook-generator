import Vue from "vue";
import Component from "vue-class-component";
import WithRender from "./main.vue";
import { Prop, Watch } from "vue-property-decorator";
import "./main.scss";
import { TunesInfo } from "ror-sheetbook-common";
import SettingsForm from "../settings-form/settings-form";
import { Socket } from "../socket";

@WithRender
@Component({
	components: { SettingsForm }
})
export default class Main extends Vue {

	@Prop({ type: Socket, required: true }) socket!: Socket;

}
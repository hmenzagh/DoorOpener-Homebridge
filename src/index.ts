import { API, HAP, Logging, AccessoryConfig, Service, Characteristic } from 'homebridge';
import axios from 'axios';

let hap: HAP;

export = (api: API) => {
  hap = api.hap;
  api.registerAccessory('PiDoor', PiDoor);
};

class PiDoor {
  private readonly log: Logging;
  private readonly config: AccessoryConfig;
  private readonly api: API;
  private readonly Service;
  private readonly Characteristic;

  private readonly currentStateCharacteristic: Characteristic;
  private readonly targetStateCharacteristic: Characteristic;
  private readonly informationService: Service;
  private readonly service: Service;

  private currentStatus = true;
  private targetStatus = true;

  /**
   * REQUIRED - This is the entry point to your plugin
   */
  constructor(log, config, api) {
    this.log = log;
    this.config = config;
    this.api = api;

    this.Service = this.api.hap.Service;
    this.Characteristic = this.api.hap.Characteristic;

    this.service = new hap.Service.LockMechanism(config.name);

    // create handlers for required characteristics
    this.currentStateCharacteristic = this.service.getCharacteristic(this.Characteristic.LockCurrentState)
      .onGet(this.handleLockCurrentStateGet.bind(this));

    this.targetStateCharacteristic = this.service.getCharacteristic(this.Characteristic.LockTargetState)
      .onGet(this.handleLockTargetStateGet.bind(this))
      .onSet(this.handleLockTargetStateSet.bind(this));

    this.informationService = new this.Service.AccessoryInformation()
      .setCharacteristic(this.Characteristic.Manufacturer, 'hmenzagh.eu')
      .setCharacteristic(this.Characteristic.Model, 'PiDoor')
      .setCharacteristic(this.Characteristic.SerialNumber, 'pi-do-or-not-to-pi-do');
  }

  /**
   * REQUIRED - This must return an array of the services you want to expose.
   * This method must be named "getServices".
   */
  getServices() {
    return [this.informationService, this.service];
  }

  async handleLockCurrentStateGet() {
    this.log.debug('Triggered GET LockCurrentState');

    const { UNSECURED, SECURED } = this.Characteristic.LockCurrentState;

    return this.currentStatus ? SECURED : UNSECURED;
  }

  async handleLockTargetStateGet() {
    this.log.debug('Triggered GET LockTargetState');

    const { UNSECURED, SECURED } = this.Characteristic.LockTargetState;

    return this.targetStatus ? SECURED : UNSECURED;
  }

  async handleLockTargetStateSet(value) {
    this.log.debug('Triggered SET LockTargetState:', value);

    const { SECURED } = this.Characteristic.LockTargetState;

    await this.updateStatus(value === SECURED);
  }

  private async updateStatus(next: boolean): Promise<void> {
    const { url, secret, port } = this.config;
    const { UNSECURED, SECURED } = this.Characteristic.LockCurrentState;

    this.targetStatus = false;
    this.targetStateCharacteristic.updateValue(UNSECURED);

    await axios.get(`${url}:${port}/open?secret=${secret}`);

    this.currentStatus = true;
	this.targetStatus = false;
	this.targetStateCharacteristic.updateValue(SECURED);
    this.currentStateCharacteristic.updateValue(SECURED);

    return;
  }
}

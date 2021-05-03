import { ConfigTransmitter, Widget } from "./widget";
import { isNone } from "./util/util";
import { Config, parseConfig, serializeConfig } from "./config";

abstract class AbstractTransmitter implements ConfigTransmitter {

    protected readonly widgets = new Array<Widget>();
    protected config: Config = {};
    protected defaultConfig: Config;

    /**
     * Returns a copy of the current configuration of this transmitter
     * including possible default values..
     */
    public get(): Config {
        return !this.defaultConfig
            ? { ...this.config }
            : { ...this.defaultConfig, ...this.config };
    }

    /**
     * Set the default configuration options of this transmitter. The default
     * values are not serialized, e.g. when updating the hash value of an URL,
     * but are passed to joined widgets. The default configuration should be set
     * before widgets join this transmitter.
     */
    withDefaults(input: Config | string) {
        if (!input)
            return;
        const config = typeof input === "string"
            ? parseConfig(input)
            : input;
        this.defaultConfig = config;
    }

    /**
     * Let the given widget join this configuration transmitter. The widget will
     * be initialized with the current configuration of this transmitter.
     */
    join(widget: Widget) {
        if (!widget) {
            return;
        }
        this.widgets.push(widget);
        widget.update(this.get());
        widget.onChanged(change => {
            this.update(change);
        });
    }

    update(input: Config | string) {
        if (!input)
            return;
        const change = typeof input === "string"
            ? parseConfig(input)
            : input;
        const current: Config = this.get();
        this.config = { ...current, ...change };
        for (const widget of this.widgets) {
            widget.update(this.config);
        }
    }

    /**
     * Updates the configation of this transmitter if the given object contains
     * properties that are not already defined. Only if there is at least one
     * such property, an update is fired.
     */
    updateIfAbsent(input: Config | string) {
        if (!input)
            return;
        const config = typeof input === "string"
            ? parseConfig(input)
            : input;

        let shouldUpdate = false;
        const current: Config = this.get();
        for (const key of Object.keys(config)) {
            const updateValue = config[key];
            if (isNone(updateValue)) {
                continue;
            }
            const currentValue = current[key];
            if (isNone(currentValue)) {
                current[key] = updateValue;
                shouldUpdate = true;
            }
        }

        if (shouldUpdate) {
            this.update(current);
        }
    }

    /**
     * Returns the serialized string of the current configuration of this
     * transmitter. Note that if default configuration options were set via the
     * `withDefaults` method, these default options are not inculded in the
     * seriualized form.
     */
    serialize(): string {
        if (!this.config) {
            return "";
        }
        if (!this.defaultConfig) {
            return serializeConfig(this.config);
        }

        // we use this isEqual test to decide whether we need to serialize an
        // attribute of the configuration or not. we do not serialze it if it
        // the config-value is equal to the default value.
        const isEqual = (v1: any, v2: any): boolean => {
            if (v1 === v2) {
                return true;
            }
            if (Array.isArray(v1) && Array.isArray(v2)) {
                let arraysEqual = true;
                for (const e1 of v1) {
                    if (!v2.includes(v1)) {
                        arraysEqual = false;
                        break;
                    }
                }
                return arraysEqual;
            }
            return false;
        };

        const nonDefaults: Config = {};
        for (const key of Object.keys(this.defaultConfig)) {
            const defaultVal = this.defaultConfig[key];
            const configVal = this.config[key];
            if (isEqual(defaultVal, configVal)) {
                continue;
            }
            nonDefaults[key] = configVal;
        }
        return serializeConfig(nonDefaults);
    }
}

/**
 * A simple `ConfigTransmitter` implementation that shares configuration
 * updates with the joined widgtes.
 */
export class EventBus extends AbstractTransmitter {
}

/**
 * A `ConfigTransmitter` implementation that reads and serializes
 * its configuration state from and to the hash part of the current
 * URL.
 */
export class UrlConfigTransmitter extends AbstractTransmitter {

    constructor() {
        super();
        this.config = this.parseUrlConfig({ withScripts: true });
        window.onhashchange = () => this.onHashChanged();
        window.addEventListener("popstate", () => this.onHashChanged());
        document.addEventListener("hashChangeEvent", () => this.onHashChanged());
    }

    private onHashChanged() {
        this.config = this.parseUrlConfig();
        const config = this.get(); // add possible defaults
        for (const widget of this.widgets) {
            widget.update(config);
        }
    }

    clearAll() {
        window.location.hash = "";
    }

    update(config: Config) {
        super.update(config);
        window.location.hash = "#" + this.serialize();
    }

    
    /**
     * Parses the URL configuration from the browser URL (window.location) and
     * optionally from the URLs of included JavaScript files. It also checks for
     * a global `hiddenhash` attribute which can contain additional
     * configuration options. Hash parameters have a higher priority than normal
     * URL parameters; the browser URL has a higher priority than the URLs of
     * included JavaScript files.
     */
    private parseUrlConfig(what?: { withScripts?: boolean }): Config {
       
        // collect the URLs
        const urls: string[] = [
            window.location.href,
        ];
        if (what && what.withScripts) {
            const scriptTags = document.getElementsByTagName("script");
            for (let i = 0; i < scriptTags.length; i++) {
                const url = scriptTags.item(i).src;
                if (url) {
                    urls.push(url);
                }
            }
        }
        // check for a global `hiddenhash` variable
        const hiddenhash = this.getHiddenHash();
        if (hiddenhash !== "") {
            urls.push("#" + hiddenhash);
        }

        let config: Config = {};
        for (const url of urls) {
            const hashParams = parseConfig(this.getHashPart(url));
            config = {...hashParams, ...config};
            const otherParams = parseConfig(this.getParameterPart(url));
            config = {...otherParams, ...config};
        }
        return config;
    }

    /**
     * We check for a global `hiddenhash` attribute for additional configuration
     * settings. This can be a string or an object with string values.
     */
    private getHiddenHash(): string {
        const hiddenhash = (window as any).hiddenhash;
        if (isNone(hiddenhash)) {
            return "";
        }
        if (typeof hiddenhash === "string") {
            return hiddenhash;
        }
        if (typeof hiddenhash === "object") {
            return Object.keys(hiddenhash)
                .map(key => `${key}=${hiddenhash[key]}`)
                .join("&");
        }
        return "";
    }

    private getHashPart(url: string): string | null {
        if (!url)
            return null;
        const parts = url.split("#");
        return parts.length < 2
            ? null
            : parts[parts.length - 1];
    }

    private getParameterPart(url: string): string | null {
        if (!url)
            return null;
        let part = url;

        // remove the hash part
        let parts = url.split("#");
        if (parts.length > 1) {
            part = parts[parts.length - 2];
        }

        // get the parameter part
        parts = part.split("?");
        return parts.length < 2
            ? null
            : parts[1];
    }
}

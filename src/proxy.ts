import { Amqp } from '@spectacles/brokers';
import { once } from 'events';

// shorthand! 
export type StringRecord = Record<string, string>;

// the options for our request
// https://github.com/spec-tacles/proxy#request-format
export interface Request {
	method: string;
	path: string;
	query?: StringRecord;
	body?: StringRecord;
	headers: StringRecord;
}

// the response statuses per
// https://github.com/spec-tacles/proxy#response-status
export enum ResponseStatus {
	SUCCESS,
	UNKNOWN_ERROR,
	INVALID_REQUEST_FORMAT,
	INVALID_URL_PATH,
	INVALID_URL_QUERY,
	INVALID_HTTP_METHOD,
	INVALID_HTTP_HEADERS,
	REQUEST_FAILURE,
}

// the response object
// https://github.com/spec-tacles/proxy#response-format
export interface Response<T> {
	status: ResponseStatus;
	// will only be a string if the Response#status is non-zero
	body: ResponseBody<T>  | string;
}

// the actual response body 
// https://github.com/spec-tacles/proxy#response-body
export interface ResponseBody<T> {
	status: number;
	headers: StringRecord;
	url: string;
	body: T;
}

// the options for initializing our proxy class
export interface ProxyOptions {
	event: string;
	group: string;
	url: string;
}

export default class Proxy {
	public _connection: any;
	public readonly broker: Amqp;

	public constructor(protected readonly options: ProxyOptions) {
		this.broker = new Amqp(options.group);
		this.broker.on('error', console.error);
	}

	/**
	 * Performs an RPC call to the proxy
	 * @param request The request data
	 */
	public async request<T = any>(request: Request): Promise<T> {
		const { body }: Response<T> = await this.broker.call(this.options.event, request);
		if (typeof body === 'string') throw Error(body);
		return body.body;
	}

	/**
	 * Connects to the RPC 
	 */
	public async connect(): Promise<this> {
		const connection = await this.broker.connect(this.options.url);
		this._connection = connection;

		return this;
	}
}
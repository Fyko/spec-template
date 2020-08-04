import { Amqp } from '@spectacles/brokers';
import { once } from 'events';

export type StringRecord = Record<string, string>;

export interface Request {
	method: string;
	path: string;
	query?: StringRecord;
	body?: StringRecord;
	headers: StringRecord;
}

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

export interface Response<T> {
	status: ResponseStatus;
	// will only be a string if the Response#status is non-zero
	body: ResponseBody<T>  | string;
}

export interface ResponseBody<T> {
	status: number;
	headers: StringRecord;
	url: string;
	body: T;
}

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

	public async request<T = any>(request: Request): Promise<Response<T>> {
		const response = await this.broker.call(this.options.event, request);
		return response;
	}

	public async connect(): Promise<this> {
		const connection = await this.broker.connect(this.options.url);
		this._connection = connection;

		return this;
	}
}
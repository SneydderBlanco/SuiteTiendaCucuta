--
-- PostgreSQL database dump
--

\restrict umYuEdrncxQLLI73c3wmWneQ4YVtaa8qeQatbnaaiA6D3u1maZxetfJZA8ffJwI

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: categoria; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categoria (
    id_categoria integer NOT NULL,
    nombre character varying(50) NOT NULL,
    descripcion text
);


ALTER TABLE public.categoria OWNER TO postgres;

--
-- Name: categoria_id_categoria_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.categoria_id_categoria_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.categoria_id_categoria_seq OWNER TO postgres;

--
-- Name: categoria_id_categoria_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.categoria_id_categoria_seq OWNED BY public.categoria.id_categoria;


--
-- Name: cliente; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cliente (
    id_cliente integer NOT NULL,
    nombre character varying(100) NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    fecha_registro timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.cliente OWNER TO postgres;

--
-- Name: cliente_id_cliente_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.cliente_id_cliente_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.cliente_id_cliente_seq OWNER TO postgres;

--
-- Name: cliente_id_cliente_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.cliente_id_cliente_seq OWNED BY public.cliente.id_cliente;


--
-- Name: detalle_venta; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.detalle_venta (
    id_detalle integer NOT NULL,
    id_venta integer,
    id_producto integer,
    cantidad integer NOT NULL,
    precio_unitario_en_momento numeric(10,2) NOT NULL
);


ALTER TABLE public.detalle_venta OWNER TO postgres;

--
-- Name: detalle_venta_id_detalle_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.detalle_venta_id_detalle_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.detalle_venta_id_detalle_seq OWNER TO postgres;

--
-- Name: detalle_venta_id_detalle_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.detalle_venta_id_detalle_seq OWNED BY public.detalle_venta.id_detalle;


--
-- Name: productos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.productos (
    id_producto integer NOT NULL,
    id_tendero integer,
    nombre character varying(100) NOT NULL,
    marca character varying(50),
    categoria character varying(50),
    precio_venta numeric(10,2),
    stock integer DEFAULT 0,
    imagen_url character varying(255)
);


ALTER TABLE public.productos OWNER TO postgres;

--
-- Name: productos_id_producto_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.productos_id_producto_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.productos_id_producto_seq OWNER TO postgres;

--
-- Name: productos_id_producto_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.productos_id_producto_seq OWNED BY public.productos.id_producto;


--
-- Name: tendero; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tendero (
    id_tendero integer NOT NULL,
    nombre character varying(100) NOT NULL,
    fecha_registro timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    email character varying(255) NOT NULL,
    codigo_invitacion character varying(50),
    nombre_tienda character varying(100),
    password character varying(255) NOT NULL,
    descripcion text,
    ubicacion text,
    logo_url text
);


ALTER TABLE public.tendero OWNER TO postgres;

--
-- Name: tendero_id_tendero_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tendero_id_tendero_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tendero_id_tendero_seq OWNER TO postgres;

--
-- Name: tendero_id_tendero_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tendero_id_tendero_seq OWNED BY public.tendero.id_tendero;


--
-- Name: tienda; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tienda (
    id_tienda integer NOT NULL,
    id_tendero integer,
    nombre character varying(100) NOT NULL,
    direccion character varying(255),
    latitud numeric(10,8),
    longitud numeric(11,8),
    tiene_domicilio boolean DEFAULT false,
    nombre_domiciliario character varying(100),
    telefono_domiciliario character varying(20),
    fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.tienda OWNER TO postgres;

--
-- Name: tienda_id_tienda_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tienda_id_tienda_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tienda_id_tienda_seq OWNER TO postgres;

--
-- Name: tienda_id_tienda_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tienda_id_tienda_seq OWNED BY public.tienda.id_tienda;


--
-- Name: venta; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.venta (
    id_venta integer NOT NULL,
    id_tienda integer,
    id_cliente integer,
    tipo_pago character varying(20) NOT NULL,
    total numeric(10,2) NOT NULL,
    saldo_pendiente numeric(10,2) DEFAULT 0,
    fecha timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.venta OWNER TO postgres;

--
-- Name: venta_id_venta_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.venta_id_venta_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.venta_id_venta_seq OWNER TO postgres;

--
-- Name: venta_id_venta_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.venta_id_venta_seq OWNED BY public.venta.id_venta;


--
-- Name: ventas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ventas (
    id integer NOT NULL,
    id_tendero integer,
    total numeric,
    fecha timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    items jsonb
);


ALTER TABLE public.ventas OWNER TO postgres;

--
-- Name: ventas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ventas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ventas_id_seq OWNER TO postgres;

--
-- Name: ventas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ventas_id_seq OWNED BY public.ventas.id;


--
-- Name: categoria id_categoria; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categoria ALTER COLUMN id_categoria SET DEFAULT nextval('public.categoria_id_categoria_seq'::regclass);


--
-- Name: cliente id_cliente; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cliente ALTER COLUMN id_cliente SET DEFAULT nextval('public.cliente_id_cliente_seq'::regclass);


--
-- Name: detalle_venta id_detalle; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_venta ALTER COLUMN id_detalle SET DEFAULT nextval('public.detalle_venta_id_detalle_seq'::regclass);


--
-- Name: productos id_producto; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.productos ALTER COLUMN id_producto SET DEFAULT nextval('public.productos_id_producto_seq'::regclass);


--
-- Name: tendero id_tendero; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tendero ALTER COLUMN id_tendero SET DEFAULT nextval('public.tendero_id_tendero_seq'::regclass);


--
-- Name: tienda id_tienda; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tienda ALTER COLUMN id_tienda SET DEFAULT nextval('public.tienda_id_tienda_seq'::regclass);


--
-- Name: venta id_venta; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.venta ALTER COLUMN id_venta SET DEFAULT nextval('public.venta_id_venta_seq'::regclass);


--
-- Name: ventas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ventas ALTER COLUMN id SET DEFAULT nextval('public.ventas_id_seq'::regclass);


--
-- Data for Name: categoria; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categoria (id_categoria, nombre, descripcion) FROM stdin;
1	Abarrotes	Productos básicos de la canasta familiar
\.


--
-- Data for Name: cliente; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cliente (id_cliente, nombre, email, password, fecha_registro) FROM stdin;
1	Consumidor Final	consumidor1@gmail.com	8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92	2026-04-27 22:03:51.141621
2	Juan Perez	juan@gmail.com	8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92	2026-05-11 14:35:26.516627
3	Christian Blanco	christiansneydder24@gmail.com	8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92	2026-05-11 15:44:36.845343
4	daniel miranda	daniel@gmail.com	8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92	2026-05-11 17:53:25.091627
\.


--
-- Data for Name: detalle_venta; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.detalle_venta (id_detalle, id_venta, id_producto, cantidad, precio_unitario_en_momento) FROM stdin;
1	3	4	1	5000.00
2	3	5	1	5000.00
3	4	5	3	5000.00
4	5	5	21	5000.00
5	5	4	1	5000.00
6	6	4	5	5000.00
7	7	4	15	5000.00
8	8	4	1	5000.00
9	9	4	1	5000.00
10	9	5	2	5000.00
11	10	5	2	5000.00
12	11	5	2	5000.00
13	12	5	2	5000.00
14	13	5	3	5000.00
15	14	5	5	5000.00
16	15	5	5	5000.00
17	15	4	2	5000.00
18	17	4	6	5000.00
\.


--
-- Data for Name: productos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.productos (id_producto, id_tendero, nombre, marca, categoria, precio_venta, stock, imagen_url) FROM stdin;
3	2	panela 1k	Morenita	alimentos	2000.00	20	/uploads/1777498242328-969832388.webp
5	1	Gaseosa 1L	CocaCola	bebidas	5000.00	50	/uploads/1778536294963-667955471.jpg
4	1	Arroz 1K	zulia	alimentos	5000.00	30	/uploads/1777495099441-479703576.webp
\.


--
-- Data for Name: tendero; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tendero (id_tendero, nombre, fecha_registro, email, codigo_invitacion, nombre_tienda, password, descripcion, ubicacion, logo_url) FROM stdin;
2	tendero2	2026-04-22 11:12:12.790578	tienda2@gmail.com	CUCUTA2026	tienda2	e2217d3e4e120c6a3372a1890f03e232b35ad659d71f7a62501a4ee204a3e66d	\N	\N	\N
1	Christian	2026-04-21 15:53:33.701289	tienda1@gmail.com	CUCUTA2026	Variedades Torcoroma	8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92	hola	calle 0 #12-03 pueblo nuevo	\N
\.


--
-- Data for Name: tienda; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tienda (id_tienda, id_tendero, nombre, direccion, latitud, longitud, tiene_domicilio, nombre_domiciliario, telefono_domiciliario, fecha_creacion) FROM stdin;
1	1	Tiendas Cúcuta Principal	Calle 10 #5-20, Centro, Cúcuta	\N	\N	f	\N	\N	2026-05-05 18:55:15.590623
\.


--
-- Data for Name: venta; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.venta (id_venta, id_tienda, id_cliente, tipo_pago, total, saldo_pendiente, fecha) FROM stdin;
3	1	\N	efectivo	10000.00	0.00	2026-05-05 19:08:43.525618
4	1	\N	transferencia	15000.00	0.00	2026-05-05 19:09:23.524061
5	1	\N	efectivo	110000.00	0.00	2026-05-05 19:11:40.604447
6	1	\N	efectivo	25000.00	0.00	2026-05-05 19:11:59.269611
7	1	\N	efectivo	75000.00	0.00	2026-05-05 19:12:17.951686
8	1	2	efectivo	5000.00	0.00	2026-05-11 14:46:53.799604
9	1	2	tarjeta	15000.00	0.00	2026-05-11 15:20:34.334731
10	1	2	efectivo	10000.00	0.00	2026-05-11 15:20:42.818764
11	1	3	efectivo	10000.00	0.00	2026-05-11 15:44:44.106495
12	1	3	efectivo	10000.00	0.00	2026-05-11 16:05:54.408263
13	1	2	efectivo	15000.00	0.00	2026-05-11 16:16:10.177805
14	1	3	efectivo	25000.00	0.00	2026-05-11 16:22:15.811642
15	1	4	tarjeta	35000.00	0.00	2026-05-11 17:54:55.244903
17	1	3	efectivo	30000.00	0.00	2026-05-18 11:48:35.906234
\.


--
-- Data for Name: ventas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ventas (id, id_tendero, total, fecha, items) FROM stdin;
1	1	10000	2026-04-29 14:15:54.702529	[{"cantidad": 2, "id_producto": 2, "precio_unitario": "5000.00"}]
2	1	10000	2026-04-29 15:43:46.989862	[{"cantidad": 1, "id_producto": 4, "precio_unitario": "5000.00"}, {"cantidad": 1, "id_producto": 2, "precio_unitario": "5000.00"}]
3	1	15000	2026-05-04 15:01:01.988884	[{"cantidad": 3, "id_producto": 4, "precio_unitario": "5000.00"}]
4	1	50000	2026-05-04 15:08:44.988364	[{"cantidad": 10, "id_producto": 4, "precio_unitario": "5000.00"}]
5	1	20000	2026-05-05 18:06:54.982063	[{"cantidad": 4, "id_producto": 4, "precio_unitario": "5000.00"}]
6	1	20000	2026-05-05 18:08:33.985085	[{"cantidad": 4, "id_producto": 5, "precio_unitario": "5000.00"}]
\.


--
-- Name: categoria_id_categoria_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.categoria_id_categoria_seq', 1, true);


--
-- Name: cliente_id_cliente_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.cliente_id_cliente_seq', 4, true);


--
-- Name: detalle_venta_id_detalle_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.detalle_venta_id_detalle_seq', 18, true);


--
-- Name: productos_id_producto_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.productos_id_producto_seq', 6, true);


--
-- Name: tendero_id_tendero_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tendero_id_tendero_seq', 2, true);


--
-- Name: tienda_id_tienda_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tienda_id_tienda_seq', 1, false);


--
-- Name: venta_id_venta_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.venta_id_venta_seq', 17, true);


--
-- Name: ventas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ventas_id_seq', 6, true);


--
-- Name: categoria categoria_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categoria
    ADD CONSTRAINT categoria_pkey PRIMARY KEY (id_categoria);


--
-- Name: cliente cliente_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cliente
    ADD CONSTRAINT cliente_email_key UNIQUE (email);


--
-- Name: cliente cliente_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cliente
    ADD CONSTRAINT cliente_pkey PRIMARY KEY (id_cliente);


--
-- Name: detalle_venta detalle_venta_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_venta
    ADD CONSTRAINT detalle_venta_pkey PRIMARY KEY (id_detalle);


--
-- Name: productos productos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_pkey PRIMARY KEY (id_producto);


--
-- Name: tendero tendero_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tendero
    ADD CONSTRAINT tendero_email_key UNIQUE (email);


--
-- Name: tendero tendero_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tendero
    ADD CONSTRAINT tendero_pkey PRIMARY KEY (id_tendero);


--
-- Name: tienda tienda_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tienda
    ADD CONSTRAINT tienda_pkey PRIMARY KEY (id_tienda);


--
-- Name: venta venta_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.venta
    ADD CONSTRAINT venta_pkey PRIMARY KEY (id_venta);


--
-- Name: ventas ventas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ventas
    ADD CONSTRAINT ventas_pkey PRIMARY KEY (id);


--
-- Name: detalle_venta detalle_venta_id_venta_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.detalle_venta
    ADD CONSTRAINT detalle_venta_id_venta_fkey FOREIGN KEY (id_venta) REFERENCES public.venta(id_venta) ON DELETE CASCADE;


--
-- Name: productos productos_id_tendero_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_id_tendero_fkey FOREIGN KEY (id_tendero) REFERENCES public.tendero(id_tendero);


--
-- Name: tienda tienda_id_tendero_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tienda
    ADD CONSTRAINT tienda_id_tendero_fkey FOREIGN KEY (id_tendero) REFERENCES public.tendero(id_tendero) ON DELETE CASCADE;


--
-- Name: venta venta_id_cliente_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.venta
    ADD CONSTRAINT venta_id_cliente_fkey FOREIGN KEY (id_cliente) REFERENCES public.cliente(id_cliente) ON DELETE SET NULL;


--
-- Name: venta venta_id_tienda_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.venta
    ADD CONSTRAINT venta_id_tienda_fkey FOREIGN KEY (id_tienda) REFERENCES public.tienda(id_tienda) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict umYuEdrncxQLLI73c3wmWneQ4YVtaa8qeQatbnaaiA6D3u1maZxetfJZA8ffJwI


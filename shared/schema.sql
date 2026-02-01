-- Payment System Database Schema
-- Run this file to set up the database structure

-- Create database
CREATE DATABASE payment_system;

-- Connect to payment_system database, then run:

-- Create schemas
CREATE SCHEMA wylies_platform;
CREATE SCHEMA trolley;
CREATE SCHEMA citibank;

-- Wylie's Platform Tables
CREATE TABLE wylies_platform.contractors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL
);

CREATE TABLE wylies_platform.payments (
    id SERIAL PRIMARY KEY,
    contractor_id INTEGER REFERENCES wylies_platform.contractors(id),
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Trolley Tables
CREATE TABLE trolley.customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    api_key VARCHAR(255) UNIQUE NOT NULL,
    webhook_url VARCHAR(255) NOT NULL,
    webhook_secret VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE trolley.payments (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES trolley.customers(id),
    recipient VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    status VARCHAR(50) NOT NULL,
    transaction_id VARCHAR(255),
    idempotency_key VARCHAR(255) UNIQUE NOT NULL,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Citibank Tables
CREATE TABLE citibank.accounts (
    id SERIAL PRIMARY KEY,
    account_number VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    balance DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE citibank.transactions (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES citibank.accounts(id),
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) NOT NULL,
    idempotency_key VARCHAR(255) UNIQUE NOT NULL,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Sample Data
INSERT INTO trolley.customers (name, api_key, webhook_url, webhook_secret) 
VALUES ('Wylies Platform', 'Bearer trolley_api_wylie123', 'http://localhost:3000/webhook', 'wylie-secret-key');

INSERT INTO wylies_platform.contractors (name, email) 
VALUES ('Wylie Glover', 'wylie@example.com');

INSERT INTO citibank.accounts (account_number, name, email, balance) 
VALUES ('ACC001', 'Wylie Glover', 'wylie@example.com', 1000.00);
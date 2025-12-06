import { Request, Response, NextFunction } from 'express';
import { requestIdMiddleware } from '../../middleware/request-id';
import { __resetCounter__ } from '../__mocks__/uuid';

describe('Request ID Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    __resetCounter__(); // Reset do contador do mock UUID
    mockReq = {
      headers: {},
    };
    mockRes = {
      setHeader: jest.fn(),
    };
    mockNext = jest.fn();
  });

  it('deve gerar um UUID quando não há X-Request-ID no header', () => {
    requestIdMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockReq.id).toBeDefined();
    expect(mockReq.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    expect(mockRes.setHeader).toHaveBeenCalledWith('X-Request-ID', mockReq.id);
    expect(mockNext).toHaveBeenCalled();
  });

  it('deve aceitar request ID fornecido pelo cliente', () => {
    const clientRequestId = 'custom-request-id-123';
    mockReq.headers = { 'x-request-id': clientRequestId };

    requestIdMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockReq.id).toBe(clientRequestId);
    expect(mockRes.setHeader).toHaveBeenCalledWith('X-Request-ID', clientRequestId);
    expect(mockNext).toHaveBeenCalled();
  });

  it('deve adicionar request ID ao objeto req para uso interno', () => {
    requestIdMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockReq.id).toBeDefined();
    expect(typeof mockReq.id).toBe('string');
  });

  it('deve adicionar header X-Request-ID na resposta', () => {
    requestIdMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.setHeader).toHaveBeenCalledWith('X-Request-ID', expect.any(String));
  });

  it('deve chamar next() para continuar o pipeline', () => {
    requestIdMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('deve gerar IDs únicos para requests diferentes', () => {
    const mockReq1 = { headers: {} } as Request;
    const mockRes1 = { setHeader: jest.fn() } as unknown as Response;
    const mockNext1 = jest.fn();

    const mockReq2 = { headers: {} } as Request;
    const mockRes2 = { setHeader: jest.fn() } as unknown as Response;
    const mockNext2 = jest.fn();

    requestIdMiddleware(mockReq1, mockRes1, mockNext1);
    requestIdMiddleware(mockReq2, mockRes2, mockNext2);

    expect(mockReq1.id).not.toBe(mockReq2.id);
  });
});

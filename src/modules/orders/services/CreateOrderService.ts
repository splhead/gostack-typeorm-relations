import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    // TODO
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer does not exists');
    }

    const productsIds = products.map(product => ({ id: product.id }));

    const productsFound = await this.productsRepository.findAllById(
      productsIds,
    );

    if (productsIds.length !== productsFound.length) {
      throw new AppError('Missing product');
    }

    const productsToSave = productsFound.map(productFound => {
      const productToSave = products.find(
        product => product.id === productFound.id,
      );

      if (!productToSave) {
        throw new AppError('Product does not found');
      }

      if (productFound.quantity < productToSave.quantity) {
        throw new AppError('Insuficient product quantity in stock');
      }

      return {
        product_id: productFound.id,
        price: productFound.price,
        quantity: productToSave?.quantity || 0,
      };
    });

    const order = await this.ordersRepository.create({
      customer,
      products: productsToSave,
    });

    await this.productsRepository.updateQuantity(products);

    return order;
  }
}

export default CreateOrderService;

import { BadRequestException, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

interface PreferenceItem {
  title: string;
  quantity: number;
  unitPrice: number;
}

interface CreatePreferenceResult {
  preferenceId: string;
  paymentLink: string;
}

const MERCADO_PAGO_API_URL = 'https://api.mercadopago.com/checkout/preferences';

@Injectable()
export class MercadoPagoService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Cria uma preferência de Checkout Pro (aceita Pix, débito e crédito num
   * único link) para um pedido, e retorna o link pronto para enviar ao cliente.
   */
  async createPreference(
    orderNumber: string,
    items: PreferenceItem[],
  ): Promise<CreatePreferenceResult> {
    const accessToken = this.configService.get<string>(
      'MERCADO_PAGO_ACCESS_TOKEN',
    );

    if (!accessToken) {
      throw new BadRequestException(
        'Mercado Pago não está configurado. Peça ao administrador para definir MERCADO_PAGO_ACCESS_TOKEN.',
      );
    }

    const frontendUrl = this.getFrontendUrl();

    try {
      const { data } = await firstValueFrom(
        this.httpService.post(
          MERCADO_PAGO_API_URL,
          {
            items: items.map((item) => ({
              title: item.title,
              quantity: item.quantity,
              unit_price: item.unitPrice,
              currency_id: 'BRL',
            })),
            external_reference: orderNumber,
            back_urls: {
              success: `${frontendUrl}/cardapio`,
              failure: `${frontendUrl}/cardapio`,
              pending: `${frontendUrl}/cardapio`,
            },
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      // Contas de teste (mesmo com token no formato APP_USR-, vinculado a um
      // "usuário de teste") só conseguem pagar de verdade via sandbox_init_point;
      // o init_point de produção não funciona para elas. Preferimos o link de
      // sandbox sempre que a API o retornar — só cai para init_point quando a
      // conta é de produção de fato (sandbox_init_point ausente).
      const paymentLink = data.sandbox_init_point || data.init_point;

      return { preferenceId: data.id, paymentLink };
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      const mpMessage = axiosError.response?.data?.message;
      throw new BadRequestException(
        mpMessage
          ? `Erro do Mercado Pago: ${mpMessage}`
          : 'Não foi possível gerar o link de pagamento. Verifique a credencial do Mercado Pago.',
      );
    }
  }

  private getFrontendUrl(): string {
    const allowedOrigins = this.configService.get<string>('ALLOWED_ORIGINS');
    const firstOrigin = allowedOrigins?.split(',')[0]?.trim();
    return firstOrigin || 'http://localhost:3000';
  }
}

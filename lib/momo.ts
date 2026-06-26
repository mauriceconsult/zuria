import "dotenv/config";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

interface RequestToPayPayload {
  amount: string;
  currency: string;
  externalId: string;
  payer: {
    partyIdType: "MSISDN";
    partyId: string;
  };
  payerMessage: string;
  payeeNote: string;
}
interface TransferPayload {
  amount: string;
  currency: string;
  externalId: string;
  payee: {
    partyIdType: "MSISDN";
    partyId: string;
  };
  payerMessage: string;
  payeeNote: string;
}

const momo = {
  // === COLLECTIONS ===
  collections: {
    async getAccessToken() {
      const { MOMO_TARGET_ENVIRONMENT, MOMO_PRIMARY_KEY, MOMOUSER_ID, MOMOUSER_SECRET } = process.env;
      
      if (!MOMO_TARGET_ENVIRONMENT || !MOMO_PRIMARY_KEY || !MOMOUSER_ID || !MOMOUSER_SECRET) {
        throw new Error("Missing Collections env vars");
      }

      const authToken = Buffer.from(`${MOMOUSER_ID}:${MOMOUSER_SECRET}`).toString("base64");
      
      const response = await axios.post(
        `${MOMO_TARGET_ENVIRONMENT}/collection/token/`,
        null,
        {
          headers: {
            "Ocp-Apim-Subscription-Key": MOMO_PRIMARY_KEY,
            Authorization: `Basic ${authToken}`,                         
          },
        }
      );
      
      return response.data.access_token;
    },

    async requestToPay(payload: RequestToPayPayload) {
      const { MOMO_TARGET_ENVIRONMENT, MOMO_PRIMARY_KEY } = process.env;
      const accessToken = await this.getAccessToken();
      const referenceId = uuidv4();

      await axios.post(
        `${MOMO_TARGET_ENVIRONMENT}/collection/v1_0/requesttopay`,
        payload,
        {
          headers: {
            "X-Reference-Id": referenceId,
            "X-Target-Environment": "sandbox",
            "Ocp-Apim-Subscription-Key": MOMO_PRIMARY_KEY,
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      return referenceId;
    },

    async checkTransactionStatus(referenceId: string) {
      const { MOMO_TARGET_ENVIRONMENT, MOMO_PRIMARY_KEY } = process.env;
      const accessToken = await this.getAccessToken();

      const response = await axios.get(
        `${MOMO_TARGET_ENVIRONMENT}/collection/v1_0/requesttopay/${referenceId}`,
        {
          headers: {
            "X-Target-Environment": "sandbox",
            "Ocp-Apim-Subscription-Key": MOMO_PRIMARY_KEY,
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      return response.data;
    },
  },

  // === DISBURSEMENTS ===
  disbursements: {
    async getAccessToken() {
      const { MOMO_TARGET_ENVIRONMENT, MOMO_PRIMARY_KEY_DISBURSEMENTS, MOMO_DISBURSE_USER_ID, MOMO_DISBURSE_USER_SECRET } = process.env;
      
      if (!MOMO_TARGET_ENVIRONMENT || !MOMO_PRIMARY_KEY_DISBURSEMENTS || !MOMO_DISBURSE_USER_ID || !MOMO_DISBURSE_USER_SECRET) {
        throw new Error("Missing Disbursements env vars");
      }
  
      const authToken = Buffer.from(`${MOMO_DISBURSE_USER_ID}:${MOMO_DISBURSE_USER_SECRET}`).toString("base64");
      
      
      const response = await axios.post(
        `${MOMO_TARGET_ENVIRONMENT}/disbursement/token/`,
        null,
        {
          headers: {
            "Ocp-Apim-Subscription-Key": MOMO_PRIMARY_KEY_DISBURSEMENTS,
            Authorization: `Basic ${authToken}`,
          },
        }
      );
      
      return response.data.access_token;
    },
  
    async transfer(payload: TransferPayload) {
      const { MOMO_TARGET_ENVIRONMENT, MOMO_PRIMARY_KEY_DISBURSEMENTS } = process.env;
      const accessToken = await this.getAccessToken();
      const referenceId = uuidv4();
  
      await axios.post(
        `${MOMO_TARGET_ENVIRONMENT}/disbursement/v1_0/transfer`,
        payload,
        {
          headers: {
            "X-Reference-Id": referenceId,
            "X-Target-Environment": "sandbox",
            "Ocp-Apim-Subscription-Key": MOMO_PRIMARY_KEY_DISBURSEMENTS,
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      
  
      return referenceId;
    },
  async validateAccountHolder(
  accountHolderIdType: string,
  accountHolderId: string
) {
  const {
    MOMO_TARGET_ENVIRONMENT,
    MOMO_PRIMARY_KEY_DISBURSEMENTS,
  } = process.env;

  const accessToken =
    await this.getAccessToken();

  const response = await axios.get(
    `${MOMO_TARGET_ENVIRONMENT}/disbursement/v1_0/accountholder/${accountHolderIdType}/${accountHolderId}/active`,
    {
      headers: {
        "X-Target-Environment": "sandbox",
        "Ocp-Apim-Subscription-Key":
          MOMO_PRIMARY_KEY_DISBURSEMENTS,
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  return response.data;
},
    // === ACCOUNT VALIDATION ===
accountValidation: {
  async validateAccount(
    accountHolderId: string,
    accountHolderIdType = "msisdn"
  ) {
    const {
      MOMO_TARGET_ENVIRONMENT,
      MOMO_PRIMARY_KEY,
    } = process.env;

    const accessToken =
      await momo.collections.getAccessToken();
    
    const url =
  `${MOMO_TARGET_ENVIRONMENT}/collection/v1_0/accountholder/${accountHolderIdType.toLowerCase()}/${accountHolderId}/active`;

console.log("Validation URL:", url);

    const response = await axios.get(
      `${MOMO_TARGET_ENVIRONMENT}/collection/v1_0/accountholder/${accountHolderIdType.toLowerCase()}/${accountHolderId}/active`,
      {
        headers: {
          "X-Target-Environment": "sandbox",
          "Ocp-Apim-Subscription-Key": MOMO_PRIMARY_KEY,
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return response.data;
  },
},

// === BALANCE ===
balance: {
  async getCollectionBalance() {
    const { MOMO_TARGET_ENVIRONMENT, MOMO_PRIMARY_KEY } = process.env;

    const accessToken =
      await momo.collections.getAccessToken();

    const response = await axios.get(
      `${MOMO_TARGET_ENVIRONMENT}/collection/v1_0/account/balance`,
      {
        headers: {
          "X-Target-Environment": "sandbox",
          "Ocp-Apim-Subscription-Key": MOMO_PRIMARY_KEY,
          Authorization: `Bearer ${accessToken}`,
          
        },
      }
    );

    return response.data;
  },

  async getDisbursementBalance() {
    return await momo.disbursements.getBalance();
  },
},

    // ✅ ADD THIS METHOD
    async getTransactionStatus(referenceId: string) {
      const { MOMO_TARGET_ENVIRONMENT, MOMO_PRIMARY_KEY_DISBURSEMENTS } = process.env;
      const accessToken = await this.getAccessToken();

      const response = await axios.get(
        `${MOMO_TARGET_ENVIRONMENT}/disbursement/v1_0/transfer/${referenceId}`,
        {
          headers: {
            "X-Target-Environment": "sandbox",
            "Ocp-Apim-Subscription-Key": MOMO_PRIMARY_KEY_DISBURSEMENTS,
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      return response.data;
    },
  
    async getBalance() {
      const { MOMO_TARGET_ENVIRONMENT, MOMO_PRIMARY_KEY_DISBURSEMENTS } = process.env;
      const accessToken = await this.getAccessToken();
  
      const response = await axios.get(
        `${MOMO_TARGET_ENVIRONMENT}/disbursement/v1_0/account/balance`,
        {
          headers: {
            "X-Target-Environment": "sandbox",
            "Ocp-Apim-Subscription-Key": MOMO_PRIMARY_KEY_DISBURSEMENTS,
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
  
      return response.data;
    },
  },
};

export { momo };
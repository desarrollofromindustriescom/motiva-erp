declare global {
   interface Assets {
      icons: string;
      pictures: string;
   }

   interface Environment {
      dir: Assets;
      apiUrl: string;
      tokenKey: string;
      primengLicence: string;
   }
}

export {};

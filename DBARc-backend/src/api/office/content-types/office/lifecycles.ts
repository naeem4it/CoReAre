declare const strapi: any;

/**
 * Safely resolves city relation ID for office records to prevent
 * "invalid input syntax for type integer: 'Lahore'" errors.
 */
async function resolveOfficeCityId(cityInput: any): Promise<number | null> {
  if (!cityInput) return null;

  if (typeof cityInput === 'number' && !isNaN(cityInput) && cityInput > 0) {
    return cityInput;
  }

  if (typeof cityInput === 'string' && !isNaN(Number(cityInput)) && Number(cityInput) > 0) {
    return Number(cityInput);
  }

  if (typeof cityInput === 'object' && cityInput !== null) {
    const objId = cityInput.id || cityInput.data?.id;
    if (objId && !isNaN(Number(objId)) && Number(objId) > 0) {
      return Number(objId);
    }
    const name = cityInput.CityName || cityInput.name || cityInput.cityName;
    if (name) {
      return resolveOfficeCityId(name);
    }
  }

  if (typeof cityInput === 'string' && cityInput.trim()) {
    const cleanName = cityInput.trim();

    try {
      let found = await strapi.db.query('api::city.city').findOne({
        where: {
          CityName: {
            $eqi: cleanName
          }
        }
      });
      if (found && found.id) return found.id;

      found = await strapi.db.query('api::city.city').findOne({
        where: {
          CityName: {
            $containsi: cleanName
          }
        }
      });
      if (found && found.id) return found.id;

      const baseName = cleanName.split(/[\s,-]/)[0]?.trim();
      if (baseName && baseName.length >= 3) {
        found = await strapi.db.query('api::city.city').findOne({
          where: {
            CityName: {
              $containsi: baseName
            }
          }
        });
        if (found && found.id) return found.id;
      }

      const newCity = await strapi.db.query('api::city.city').create({
        data: {
          CityName: cleanName,
          Active: true,
          publishedAt: new Date(),
        }
      });
      if (newCity && newCity.id) {
        return newCity.id;
      }
    } catch (err: any) {
      console.warn(`[office lifecycles] Error resolving city "${cleanName}":`, err?.message || err);
    }
  }

  return null;
}

export default {
  async beforeCreate(event: any) {
    const { data } = event.params;
    if (data && data.city !== undefined) {
      data.city = await resolveOfficeCityId(data.city);
    }
  },
  async beforeUpdate(event: any) {
    const { data } = event.params;
    if (data && data.city !== undefined) {
      data.city = await resolveOfficeCityId(data.city);
    }
  }
};

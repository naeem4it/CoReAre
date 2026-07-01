import type { Schema, Struct } from '@strapi/strapi';

export interface AdminApiToken extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_api_tokens';
  info: {
    description: '';
    displayName: 'Api Token';
    name: 'Api Token';
    pluralName: 'api-tokens';
    singularName: 'api-token';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    accessKey: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    adminPermissions: Schema.Attribute.Relation<
      'oneToMany',
      'admin::permission'
    >;
    adminUserOwner: Schema.Attribute.Relation<'manyToOne', 'admin::user'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }> &
      Schema.Attribute.DefaultTo<''>;
    encryptedKey: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    expiresAt: Schema.Attribute.DateTime;
    kind: Schema.Attribute.Enumeration<['content-api', 'admin']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'content-api'>;
    lastUsedAt: Schema.Attribute.DateTime;
    lifespan: Schema.Attribute.BigInteger;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::api-token'> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Schema.Attribute.Relation<
      'oneToMany',
      'admin::api-token-permission'
    >;
    publishedAt: Schema.Attribute.DateTime;
    type: Schema.Attribute.Enumeration<['read-only', 'full-access', 'custom']> &
      Schema.Attribute.DefaultTo<'read-only'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminApiTokenPermission extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_api_token_permissions';
  info: {
    description: '';
    displayName: 'API Token Permission';
    name: 'API Token Permission';
    pluralName: 'api-token-permissions';
    singularName: 'api-token-permission';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'admin::api-token-permission'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    token: Schema.Attribute.Relation<'manyToOne', 'admin::api-token'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminPermission extends Struct.CollectionTypeSchema {
  collectionName: 'admin_permissions';
  info: {
    description: '';
    displayName: 'Permission';
    name: 'Permission';
    pluralName: 'permissions';
    singularName: 'permission';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    actionParameters: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    apiToken: Schema.Attribute.Relation<'manyToOne', 'admin::api-token'>;
    conditions: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<[]>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::permission'> &
      Schema.Attribute.Private;
    properties: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    publishedAt: Schema.Attribute.DateTime;
    role: Schema.Attribute.Relation<'manyToOne', 'admin::role'>;
    subject: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminRole extends Struct.CollectionTypeSchema {
  collectionName: 'admin_roles';
  info: {
    description: '';
    displayName: 'Role';
    name: 'Role';
    pluralName: 'roles';
    singularName: 'role';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    code: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::role'> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Schema.Attribute.Relation<'oneToMany', 'admin::permission'>;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    users: Schema.Attribute.Relation<'manyToMany', 'admin::user'>;
  };
}

export interface AdminSession extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_sessions';
  info: {
    description: 'Session Manager storage';
    displayName: 'Session';
    name: 'Session';
    pluralName: 'sessions';
    singularName: 'session';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
    i18n: {
      localized: false;
    };
  };
  attributes: {
    absoluteExpiresAt: Schema.Attribute.DateTime & Schema.Attribute.Private;
    childId: Schema.Attribute.String & Schema.Attribute.Private;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deviceId: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private;
    expiresAt: Schema.Attribute.DateTime &
      Schema.Attribute.Required &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::session'> &
      Schema.Attribute.Private;
    origin: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    sessionId: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private &
      Schema.Attribute.Unique;
    status: Schema.Attribute.String & Schema.Attribute.Private;
    type: Schema.Attribute.String & Schema.Attribute.Private;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    userId: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private;
  };
}

export interface AdminTransferToken extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_transfer_tokens';
  info: {
    description: '';
    displayName: 'Transfer Token';
    name: 'Transfer Token';
    pluralName: 'transfer-tokens';
    singularName: 'transfer-token';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    accessKey: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }> &
      Schema.Attribute.DefaultTo<''>;
    expiresAt: Schema.Attribute.DateTime;
    lastUsedAt: Schema.Attribute.DateTime;
    lifespan: Schema.Attribute.BigInteger;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'admin::transfer-token'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Schema.Attribute.Relation<
      'oneToMany',
      'admin::transfer-token-permission'
    >;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminTransferTokenPermission
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_transfer_token_permissions';
  info: {
    description: '';
    displayName: 'Transfer Token Permission';
    name: 'Transfer Token Permission';
    pluralName: 'transfer-token-permissions';
    singularName: 'transfer-token-permission';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'admin::transfer-token-permission'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    token: Schema.Attribute.Relation<'manyToOne', 'admin::transfer-token'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminUser extends Struct.CollectionTypeSchema {
  collectionName: 'admin_users';
  info: {
    description: '';
    displayName: 'User';
    name: 'User';
    pluralName: 'users';
    singularName: 'user';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    apiTokens: Schema.Attribute.Relation<'oneToMany', 'admin::api-token'> &
      Schema.Attribute.Private;
    blocked: Schema.Attribute.Boolean &
      Schema.Attribute.Private &
      Schema.Attribute.DefaultTo<false>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    email: Schema.Attribute.Email &
      Schema.Attribute.Required &
      Schema.Attribute.Private &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    firstname: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    isActive: Schema.Attribute.Boolean &
      Schema.Attribute.Private &
      Schema.Attribute.DefaultTo<false>;
    lastname: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::user'> &
      Schema.Attribute.Private;
    password: Schema.Attribute.Password &
      Schema.Attribute.Private &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    preferedLanguage: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    registrationToken: Schema.Attribute.String & Schema.Attribute.Private;
    resetPasswordToken: Schema.Attribute.String & Schema.Attribute.Private;
    roles: Schema.Attribute.Relation<'manyToMany', 'admin::role'> &
      Schema.Attribute.Private;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    username: Schema.Attribute.String;
  };
}

export interface ApiAboutAbout extends Struct.SingleTypeSchema {
  collectionName: 'abouts';
  info: {
    description: 'Write about yourself and the content you create';
    displayName: 'About';
    pluralName: 'abouts';
    singularName: 'about';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    blocks: Schema.Attribute.DynamicZone<
      ['shared.media', 'shared.quote', 'shared.rich-text', 'shared.slider']
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::about.about'> &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    title: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiArrivalArrival extends Struct.CollectionTypeSchema {
  collectionName: 'arrivals';
  info: {
    description: 'Log logs for arrived parcels checked in by riders';
    displayName: 'Arrival';
    pluralName: 'arrivals';
    singularName: 'arrival';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    arrival_date: Schema.Attribute.DateTime & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::arrival.arrival'
    > &
      Schema.Attribute.Private;
    parcels: Schema.Attribute.Relation<'manyToMany', 'api::parcel.parcel'>;
    publishedAt: Schema.Attribute.DateTime;
    rider: Schema.Attribute.Relation<'manyToOne', 'api::rider.rider'>;
    total_pieces: Schema.Attribute.Integer;
    total_weight: Schema.Attribute.Decimal;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiArticleArticle extends Struct.CollectionTypeSchema {
  collectionName: 'articles';
  info: {
    description: 'Create your blog content';
    displayName: 'Article';
    pluralName: 'articles';
    singularName: 'article';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    author: Schema.Attribute.Relation<'manyToOne', 'api::author.author'>;
    blocks: Schema.Attribute.DynamicZone<
      ['shared.media', 'shared.quote', 'shared.rich-text', 'shared.slider']
    >;
    category: Schema.Attribute.Relation<'manyToOne', 'api::category.category'>;
    cover: Schema.Attribute.Media<'images' | 'files' | 'videos'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::article.article'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    slug: Schema.Attribute.UID<'title'>;
    title: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiAuthorAuthor extends Struct.CollectionTypeSchema {
  collectionName: 'authors';
  info: {
    description: 'Create authors for your content';
    displayName: 'Author';
    pluralName: 'authors';
    singularName: 'author';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    articles: Schema.Attribute.Relation<'oneToMany', 'api::article.article'>;
    avatar: Schema.Attribute.Media<'images' | 'files' | 'videos'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    email: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::author.author'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiBagBag extends Struct.CollectionTypeSchema {
  collectionName: 'bags';
  info: {
    description: 'Consolidated parcel transit bags between hubs';
    displayName: 'Bag';
    pluralName: 'bags';
    singularName: 'bag';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    bag_number: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    from_hub: Schema.Attribute.Relation<'manyToOne', 'api::hub.hub'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::bag.bag'> &
      Schema.Attribute.Private;
    parcel_count: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    publishedAt: Schema.Attribute.DateTime;
    sealed_at: Schema.Attribute.DateTime;
    status: Schema.Attribute.String & Schema.Attribute.DefaultTo<'open'>;
    tenant: Schema.Attribute.Relation<'manyToOne', 'api::tenant.tenant'>;
    to_hub: Schema.Attribute.Relation<'manyToOne', 'api::hub.hub'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiCategoryCategory extends Struct.CollectionTypeSchema {
  collectionName: 'categories';
  info: {
    description: 'Organize your content into categories';
    displayName: 'Category';
    pluralName: 'categories';
    singularName: 'category';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    articles: Schema.Attribute.Relation<'oneToMany', 'api::article.article'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.Text;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::category.category'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    slug: Schema.Attribute.UID;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiCityCity extends Struct.CollectionTypeSchema {
  collectionName: 'cities';
  info: {
    displayName: 'City';
    pluralName: 'cities';
    singularName: 'city';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    Active: Schema.Attribute.Boolean;
    CityName: Schema.Attribute.String;
    courier_cities: Schema.Attribute.Relation<
      'manyToMany',
      'api::courier-city.courier-city'
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::city.city'> &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    regions: Schema.Attribute.Relation<'manyToMany', 'api::region.region'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiCodSettlementCodSettlement
  extends Struct.CollectionTypeSchema {
  collectionName: 'cod_settlements';
  info: {
    description: 'Invoicing and billing settlements for collected Cash On Delivery funds';
    displayName: 'COD Settlement';
    pluralName: 'cod-settlements';
    singularName: 'cod-settlement';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    delivered_count: Schema.Attribute.Integer;
    ibft_charges: Schema.Attribute.Decimal & Schema.Attribute.DefaultTo<0>;
    invoice_date: Schema.Attribute.Date;
    invoice_number: Schema.Attribute.String & Schema.Attribute.Unique;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::cod-settlement.cod-settlement'
    > &
      Schema.Attribute.Private;
    net_payable: Schema.Attribute.Decimal & Schema.Attribute.Required;
    paid_at: Schema.Attribute.DateTime;
    period_end: Schema.Attribute.Date;
    period_start: Schema.Attribute.Date;
    publishedAt: Schema.Attribute.DateTime;
    returned_count: Schema.Attribute.Integer;
    service_charges: Schema.Attribute.Decimal & Schema.Attribute.DefaultTo<0>;
    shipper: Schema.Attribute.Relation<'manyToOne', 'api::shipper.shipper'>;
    statement_pdf: Schema.Attribute.String;
    status: Schema.Attribute.Enumeration<
      ['calculated', 'approved', 'processing', 'paid', 'disputed']
    > &
      Schema.Attribute.DefaultTo<'calculated'>;
    tenant: Schema.Attribute.Relation<'manyToOne', 'api::tenant.tenant'>;
    total_cod_collected: Schema.Attribute.Decimal & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiCourierCityCourierCity extends Struct.CollectionTypeSchema {
  collectionName: 'courier_cities';
  info: {
    displayName: 'CourierCity';
    pluralName: 'courier-cities';
    singularName: 'courier-city';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    cities: Schema.Attribute.Relation<'manyToMany', 'api::city.city'>;
    couriers: Schema.Attribute.Relation<'manyToMany', 'api::courier.courier'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::courier-city.courier-city'
    > &
      Schema.Attribute.Private;
    parcel: Schema.Attribute.Relation<'oneToOne', 'api::parcel.parcel'>;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiCourierCourier extends Struct.CollectionTypeSchema {
  collectionName: 'couriers';
  info: {
    description: 'Internal and 3PL courier/carrier partners';
    displayName: 'Courier';
    pluralName: 'couriers';
    singularName: 'courier';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    api_enabled: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    contact_info: Schema.Attribute.JSON;
    courier_cities: Schema.Attribute.Relation<
      'manyToMany',
      'api::courier-city.courier-city'
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::courier.courier'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    parcel: Schema.Attribute.Relation<'oneToOne', 'api::parcel.parcel'>;
    publishedAt: Schema.Attribute.DateTime;
    regions: Schema.Attribute.Relation<'oneToMany', 'api::region.region'>;
    shipper_plans: Schema.Attribute.Relation<
      'oneToMany',
      'api::shipper-plan.shipper-plan'
    >;
    shippers: Schema.Attribute.Relation<'manyToMany', 'api::shipper.shipper'>;
    status: Schema.Attribute.String & Schema.Attribute.DefaultTo<'active'>;
    tenant: Schema.Attribute.Relation<'manyToOne', 'api::tenant.tenant'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiDeliveryAttemptDeliveryAttempt
  extends Struct.CollectionTypeSchema {
  collectionName: 'delivery_attempts';
  info: {
    description: 'Log of delivery attempts made by riders';
    displayName: 'Delivery Attempt';
    pluralName: 'delivery-attempts';
    singularName: 'delivery-attempt';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    advice_status: Schema.Attribute.Enumeration<
      ['Awaiting advice', 'Resolved', 'Failed']
    > &
      Schema.Attribute.DefaultTo<'Awaiting advice'>;
    attempt_time: Schema.Attribute.DateTime;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    failure_reason: Schema.Attribute.String;
    geo_location: Schema.Attribute.JSON;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::delivery-attempt.delivery-attempt'
    > &
      Schema.Attribute.Private;
    parcel: Schema.Attribute.Relation<'manyToOne', 'api::parcel.parcel'>;
    proof_of_delivery_url: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    recipient_name: Schema.Attribute.String;
    recipient_relation: Schema.Attribute.String;
    rider: Schema.Attribute.Relation<'manyToOne', 'api::rider.rider'>;
    shipper_advice: Schema.Attribute.Text;
    status: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiDeliverySheetDeliverySheet
  extends Struct.CollectionTypeSchema {
  collectionName: 'delivery_sheets';
  info: {
    description: 'Rider run sheets and dispatch assignments';
    displayName: 'Delivery Sheet';
    pluralName: 'delivery-sheets';
    singularName: 'delivery-sheet';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    custom_name: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::delivery-sheet.delivery-sheet'
    > &
      Schema.Attribute.Private;
    parcels: Schema.Attribute.Relation<'manyToMany', 'api::parcel.parcel'>;
    publishedAt: Schema.Attribute.DateTime;
    rider: Schema.Attribute.Relation<'manyToOne', 'api::rider.rider'>;
    route_code: Schema.Attribute.String;
    sheet_date: Schema.Attribute.Date & Schema.Attribute.Required;
    sheet_number: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    status: Schema.Attribute.Enumeration<
      ['Pending', 'Out For Delivery', 'Completed']
    > &
      Schema.Attribute.DefaultTo<'Pending'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiDisputeDispute extends Struct.CollectionTypeSchema {
  collectionName: 'disputes';
  info: {
    description: 'Claims and customer support tickets for lost/damaged parcels';
    displayName: 'Dispute';
    pluralName: 'disputes';
    singularName: 'dispute';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    category: Schema.Attribute.String & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.Text;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::dispute.dispute'
    > &
      Schema.Attribute.Private;
    parcel: Schema.Attribute.Relation<'manyToOne', 'api::parcel.parcel'>;
    publishedAt: Schema.Attribute.DateTime;
    resolution: Schema.Attribute.Text;
    status: Schema.Attribute.String & Schema.Attribute.DefaultTo<'open'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiEventStreamEventStream extends Struct.CollectionTypeSchema {
  collectionName: 'event_streams';
  info: {
    description: 'Real-time telemetry event stream log for auditing and webhooks';
    displayName: 'Event Stream';
    pluralName: 'event-streams';
    singularName: 'event-stream';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    entity_id: Schema.Attribute.String & Schema.Attribute.Required;
    entity_type: Schema.Attribute.String & Schema.Attribute.Required;
    event_type: Schema.Attribute.String & Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::event-stream.event-stream'
    > &
      Schema.Attribute.Private;
    payload: Schema.Attribute.JSON;
    publishedAt: Schema.Attribute.DateTime;
    tenant: Schema.Attribute.Relation<'manyToOne', 'api::tenant.tenant'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiGlobalGlobal extends Struct.SingleTypeSchema {
  collectionName: 'globals';
  info: {
    description: 'Define global settings';
    displayName: 'Global';
    pluralName: 'globals';
    singularName: 'global';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    defaultSeo: Schema.Attribute.Component<'shared.seo', false>;
    favicon: Schema.Attribute.Media<'images' | 'files' | 'videos'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::global.global'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    siteDescription: Schema.Attribute.Text & Schema.Attribute.Required;
    siteName: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiHubHub extends Struct.CollectionTypeSchema {
  collectionName: 'hubs';
  info: {
    description: 'Courier operational hubs (pickup, sorting, delivery)';
    displayName: 'Hub';
    pluralName: 'hubs';
    singularName: 'hub';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    address: Schema.Attribute.Text;
    capacity_weight: Schema.Attribute.Decimal;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    geo_location: Schema.Attribute.JSON;
    hub_type: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::hub.hub'> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    status: Schema.Attribute.String & Schema.Attribute.DefaultTo<'active'>;
    tenant: Schema.Attribute.Relation<'manyToOne', 'api::tenant.tenant'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiInvoiceInvoice extends Struct.CollectionTypeSchema {
  collectionName: 'invoices';
  info: {
    description: 'Shipper billing invoices';
    displayName: 'Invoice';
    pluralName: 'invoices';
    singularName: 'invoice';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    invoice_date: Schema.Attribute.Date & Schema.Attribute.Required;
    invoice_number: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::invoice.invoice'
    > &
      Schema.Attribute.Private;
    period_end: Schema.Attribute.Date;
    period_start: Schema.Attribute.Date;
    publishedAt: Schema.Attribute.DateTime;
    shipper: Schema.Attribute.Relation<'manyToOne', 'api::shipper.shipper'>;
    status: Schema.Attribute.Enumeration<['Paid', 'Pending', 'Overdue']> &
      Schema.Attribute.DefaultTo<'Pending'>;
    total_charges: Schema.Attribute.Decimal & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiLoadSheetLoadSheet extends Struct.CollectionTypeSchema {
  collectionName: 'load_sheets';
  info: {
    description: 'Cargo distribution sheets for dispatched routes';
    displayName: 'Load Sheet';
    pluralName: 'load-sheets';
    singularName: 'load-sheet';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    date_created: Schema.Attribute.DateTime & Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::load-sheet.load-sheet'
    > &
      Schema.Attribute.Private;
    origin_hub: Schema.Attribute.Relation<'manyToOne', 'api::hub.hub'>;
    parcels: Schema.Attribute.Relation<'oneToMany', 'api::parcel.parcel'>;
    publishedAt: Schema.Attribute.DateTime;
    sheet_id: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    status: Schema.Attribute.Enumeration<
      ['Pending', 'Dispatched', 'On-Route', 'Delivered']
    > &
      Schema.Attribute.DefaultTo<'Pending'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiOfficeOffice extends Struct.CollectionTypeSchema {
  collectionName: 'offices';
  info: {
    description: 'Physical offices for Couriers and Shippers';
    displayName: 'Office';
    pluralName: 'offices';
    singularName: 'office';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    address: Schema.Attribute.Text;
    city: Schema.Attribute.Relation<'manyToOne', 'api::city.city'>;
    courier: Schema.Attribute.Relation<'manyToOne', 'api::courier.courier'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::office.office'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    phone: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    shipper: Schema.Attribute.Relation<'manyToOne', 'api::shipper.shipper'>;
    status: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    tenant: Schema.Attribute.Relation<'manyToOne', 'api::tenant.tenant'>;
    type: Schema.Attribute.Enumeration<['courier', 'shipper']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'courier'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiParcelHubMovementParcelHubMovement
  extends Struct.CollectionTypeSchema {
  collectionName: 'parcel_hub_movements';
  info: {
    description: 'Tracking log of parcel movements through hubs and bags';
    displayName: 'Parcel Hub Movement';
    pluralName: 'parcel-hub-movements';
    singularName: 'parcel-hub-movement';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    bag: Schema.Attribute.Relation<'manyToOne', 'api::bag.bag'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    from_hub: Schema.Attribute.Relation<'manyToOne', 'api::hub.hub'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::parcel-hub-movement.parcel-hub-movement'
    > &
      Schema.Attribute.Private;
    moved_at: Schema.Attribute.DateTime;
    moved_by: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    >;
    parcel: Schema.Attribute.Relation<'manyToOne', 'api::parcel.parcel'>;
    publishedAt: Schema.Attribute.DateTime;
    to_hub: Schema.Attribute.Relation<'manyToOne', 'api::hub.hub'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiParcelParcel extends Struct.CollectionTypeSchema {
  collectionName: 'parcels';
  info: {
    description: 'Logistics parcel entities';
    displayName: 'Parcel';
    pluralName: 'parcels';
    singularName: 'parcel';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    allow_to_open: Schema.Attribute.Enumeration<['Yes', 'No']> &
      Schema.Attribute.DefaultTo<'No'>;
    arrival_date: Schema.Attribute.DateTime;
    cod_amount: Schema.Attribute.Decimal & Schema.Attribute.DefaultTo<0>;
    comments: Schema.Attribute.Text;
    consignee_alt_phone: Schema.Attribute.String;
    consignee_email: Schema.Attribute.String;
    courier: Schema.Attribute.Relation<'oneToOne', 'api::courier.courier'>;
    courier_city: Schema.Attribute.Relation<
      'oneToOne',
      'api::courier-city.courier-city'
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    delivered_date: Schema.Attribute.DateTime;
    delivery_charges: Schema.Attribute.Decimal & Schema.Attribute.Required;
    destination_city: Schema.Attribute.Relation<'manyToOne', 'api::city.city'>;
    is_3pl: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    load_sheet: Schema.Attribute.Relation<
      'manyToOne',
      'api::load-sheet.load-sheet'
    >;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::parcel.parcel'
    > &
      Schema.Attribute.Private;
    origin_office: Schema.Attribute.Relation<'manyToOne', 'api::office.office'>;
    pickup_location: Schema.Attribute.Relation<
      'manyToOne',
      'api::pickup-location.pickup-location'
    >;
    pieces: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<1>;
    publishedAt: Schema.Attribute.DateTime;
    recipient_address: Schema.Attribute.Text & Schema.Attribute.Required;
    recipient_name: Schema.Attribute.String & Schema.Attribute.Required;
    recipient_phone: Schema.Attribute.String & Schema.Attribute.Required;
    reference_number: Schema.Attribute.String;
    service_type: Schema.Attribute.Enumeration<
      ['Overnight', 'Second Day', 'Rush', 'Detained']
    > &
      Schema.Attribute.DefaultTo<'Overnight'>;
    shipment_type: Schema.Attribute.Enumeration<
      ['Parcel', 'Document', 'Flyer']
    > &
      Schema.Attribute.DefaultTo<'Parcel'>;
    source_city: Schema.Attribute.Relation<'manyToOne', 'api::city.city'>;
    status: Schema.Attribute.Enumeration<
      [
        'Total Booking',
        'Not Arrived',
        'Arrived',
        'Arrived At Destination',
        'Out For delivery',
        'Delivered',
        'Failed Attempt',
        'Ready To Return',
        'Return Dispatched',
        'Return to Shipper',
      ]
    > &
      Schema.Attribute.DefaultTo<'Total Booking'>;
    tracking_number: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    weight: Schema.Attribute.Decimal & Schema.Attribute.Required;
  };
}

export interface ApiPickupLocationPickupLocation
  extends Struct.CollectionTypeSchema {
  collectionName: 'pickup_locations';
  info: {
    description: 'Shipper warehouse and dispatch sites';
    displayName: 'Pickup Location';
    pluralName: 'pickup-locations';
    singularName: 'pickup-location';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    address: Schema.Attribute.Text & Schema.Attribute.Required;
    city: Schema.Attribute.Relation<'manyToOne', 'api::city.city'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    email: Schema.Attribute.Email;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::pickup-location.pickup-location'
    > &
      Schema.Attribute.Private;
    location_name: Schema.Attribute.String & Schema.Attribute.Required;
    phone: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    shipper: Schema.Attribute.Relation<'manyToOne', 'api::shipper.shipper'>;
    status: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiPickupRequestPickupRequest
  extends Struct.CollectionTypeSchema {
  collectionName: 'pickup_requests';
  info: {
    description: 'Shipper requests for bulk parcel pickups';
    displayName: 'Pickup Request';
    pluralName: 'pickup-requests';
    singularName: 'pickup-request';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::pickup-request.pickup-request'
    > &
      Schema.Attribute.Private;
    parcel_count: Schema.Attribute.Integer;
    publishedAt: Schema.Attribute.DateTime;
    requested_date: Schema.Attribute.Date & Schema.Attribute.Required;
    shipper: Schema.Attribute.Relation<'manyToOne', 'api::shipper.shipper'>;
    status: Schema.Attribute.String & Schema.Attribute.DefaultTo<'requested'>;
    tenant: Schema.Attribute.Relation<'manyToOne', 'api::tenant.tenant'>;
    time_slot_id: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiPlatformIntegrationPlatformIntegration
  extends Struct.CollectionTypeSchema {
  collectionName: 'platform_integrations';
  info: {
    description: 'Shopify, WooCommerce, and other external store sync settings';
    displayName: 'Platform Integration';
    pluralName: 'platform-integrations';
    singularName: 'platform-integration';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    api_credentials: Schema.Attribute.JSON;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    last_sync_at: Schema.Attribute.DateTime;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::platform-integration.platform-integration'
    > &
      Schema.Attribute.Private;
    platform_type: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    shipper: Schema.Attribute.Relation<'manyToOne', 'api::shipper.shipper'>;
    store_url: Schema.Attribute.String;
    sync_settings: Schema.Attribute.JSON;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    webhook_secret: Schema.Attribute.String;
  };
}

export interface ApiRatingRating extends Struct.CollectionTypeSchema {
  collectionName: 'ratings';
  info: {
    description: 'Customer ratings and feedback for riders and deliveries';
    displayName: 'Rating';
    pluralName: 'ratings';
    singularName: 'rating';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    feedback: Schema.Attribute.Text;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::rating.rating'
    > &
      Schema.Attribute.Private;
    parcel: Schema.Attribute.Relation<'manyToOne', 'api::parcel.parcel'>;
    publishedAt: Schema.Attribute.DateTime;
    rider: Schema.Attribute.Relation<'manyToOne', 'api::rider.rider'>;
    stars: Schema.Attribute.Integer & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiRegionCoverageRuleRegionCoverageRule
  extends Struct.CollectionTypeSchema {
  collectionName: 'region_coverage_rules';
  info: {
    description: 'Defines coverage routing for zones (e.g. self-delivery or 3PL)';
    displayName: 'Region Coverage Rule';
    pluralName: 'region-coverage-rules';
    singularName: 'region-coverage-rule';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    coverage_type: Schema.Attribute.String & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::region-coverage-rule.region-coverage-rule'
    > &
      Schema.Attribute.Private;
    preferred_tpl_partner: Schema.Attribute.Relation<
      'manyToOne',
      'api::tpl-partner.tpl-partner'
    >;
    publishedAt: Schema.Attribute.DateTime;
    region: Schema.Attribute.Relation<'manyToOne', 'api::region.region'>;
    tenant: Schema.Attribute.Relation<'manyToOne', 'api::tenant.tenant'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiRegionRegion extends Struct.CollectionTypeSchema {
  collectionName: 'regions';
  info: {
    description: 'Geographical coverage zones, cities, states, and polygons';
    displayName: 'Region';
    pluralName: 'regions';
    singularName: 'region';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    active: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    cities: Schema.Attribute.Relation<'manyToMany', 'api::city.city'>;
    courier: Schema.Attribute.Relation<'manyToOne', 'api::courier.courier'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    geo_polygon: Schema.Attribute.JSON;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::region.region'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    parent: Schema.Attribute.Relation<'manyToOne', 'api::region.region'>;
    publishedAt: Schema.Attribute.DateTime;
    tenant: Schema.Attribute.Relation<'manyToOne', 'api::tenant.tenant'>;
    type: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiReplacementReplacement extends Struct.CollectionTypeSchema {
  collectionName: 'replacements';
  info: {
    description: 'Links new shipment order bookings to older shipments for replacements.';
    displayName: 'Replacement';
    pluralName: 'replacements';
    singularName: 'replacement';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    collect_replacement: Schema.Attribute.Enumeration<['Yes', 'No']> &
      Schema.Attribute.DefaultTo<'No'>;
    collect_rs: Schema.Attribute.Decimal;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::replacement.replacement'
    > &
      Schema.Attribute.Private;
    orderid: Schema.Attribute.Relation<'manyToOne', 'api::parcel.parcel'>;
    parcel_detail: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    replacementorderid: Schema.Attribute.Relation<
      'oneToOne',
      'api::parcel.parcel'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiRiderAssignmentRiderAssignment
  extends Struct.CollectionTypeSchema {
  collectionName: 'rider_assignments';
  info: {
    description: 'Assigning parcels to riders for dispatch';
    displayName: 'Rider Assignment';
    pluralName: 'rider-assignments';
    singularName: 'rider-assignment';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    accepted_at: Schema.Attribute.DateTime;
    assigned_at: Schema.Attribute.DateTime;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::rider-assignment.rider-assignment'
    > &
      Schema.Attribute.Private;
    parcel: Schema.Attribute.Relation<'manyToOne', 'api::parcel.parcel'>;
    publishedAt: Schema.Attribute.DateTime;
    rider: Schema.Attribute.Relation<'manyToOne', 'api::rider.rider'>;
    status: Schema.Attribute.String & Schema.Attribute.DefaultTo<'assigned'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiRiderLocationHistoryRiderLocationHistory
  extends Struct.CollectionTypeSchema {
  collectionName: 'rider_location_histories';
  info: {
    description: 'Periodic coordinates recorded for riders during shifts';
    displayName: 'Rider Location History';
    pluralName: 'rider-location-historys';
    singularName: 'rider-location-history';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::rider-location-history.rider-location-history'
    > &
      Schema.Attribute.Private;
    location: Schema.Attribute.JSON & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    recorded_at: Schema.Attribute.DateTime;
    rider: Schema.Attribute.Relation<'manyToOne', 'api::rider.rider'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiRiderRider extends Struct.CollectionTypeSchema {
  collectionName: 'riders';
  info: {
    description: 'Delivery riders for the courier service';
    displayName: 'Rider';
    pluralName: 'riders';
    singularName: 'rider';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    email: Schema.Attribute.Email;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::rider.rider'> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    phone: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    publishedAt: Schema.Attribute.DateTime;
    rider_code: Schema.Attribute.String & Schema.Attribute.Unique;
    status: Schema.Attribute.Enumeration<['active', 'inactive', 'suspended']> &
      Schema.Attribute.DefaultTo<'active'>;
    tenant: Schema.Attribute.Relation<'manyToOne', 'api::tenant.tenant'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiRoleDefinitionRoleDefinition
  extends Struct.CollectionTypeSchema {
  collectionName: 'role_definitions';
  info: {
    description: 'Tenant custom user roles and permissions definitions';
    displayName: 'Role Definition';
    pluralName: 'role-definitions';
    singularName: 'role-definition';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::role-definition.role-definition'
    > &
      Schema.Attribute.Private;
    permissions: Schema.Attribute.JSON & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    role_name: Schema.Attribute.String & Schema.Attribute.Required;
    tenant: Schema.Attribute.Relation<'manyToOne', 'api::tenant.tenant'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiShipperPlanShipperPlan extends Struct.CollectionTypeSchema {
  collectionName: 'shipper_plans';
  info: {
    description: 'Courier-defined plans assigned to Shipper Businesses';
    displayName: 'Shipper Plan';
    pluralName: 'shipper-plans';
    singularName: 'shipper-plan';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    api_access: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    charge_type: Schema.Attribute.Enumeration<
      ['percentage', 'fixed_rupees', 'tier_based']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'percentage'>;
    charge_value: Schema.Attribute.Decimal;
    cod_charge_type: Schema.Attribute.Enumeration<
      ['percentage', 'fixed_rupees']
    >;
    cod_charge_value: Schema.Attribute.Decimal;
    courier: Schema.Attribute.Relation<'manyToOne', 'api::courier.courier'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::shipper-plan.shipper-plan'
    > &
      Schema.Attribute.Private;
    max_parcels_per_month: Schema.Attribute.Integer;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    replacement_charge_type: Schema.Attribute.Enumeration<
      ['percentage', 'fixed_rupees']
    >;
    replacement_charge_value: Schema.Attribute.Decimal;
    rto_charge_type: Schema.Attribute.Enumeration<
      ['percentage', 'fixed_rupees']
    >;
    rto_charge_value: Schema.Attribute.Decimal;
    shippers: Schema.Attribute.Relation<'oneToMany', 'api::shipper.shipper'>;
    support_level: Schema.Attribute.String;
    tenant: Schema.Attribute.Relation<'manyToOne', 'api::tenant.tenant'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiShipperWalletShipperWallet
  extends Struct.CollectionTypeSchema {
  collectionName: 'shipper_wallets';
  info: {
    description: 'Financial balance sheet wallet for shippers';
    displayName: 'Shipper Wallet';
    pluralName: 'shipper-wallets';
    singularName: 'shipper-wallet';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    balance: Schema.Attribute.Decimal & Schema.Attribute.DefaultTo<0>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    currency: Schema.Attribute.String & Schema.Attribute.DefaultTo<'PKR'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::shipper-wallet.shipper-wallet'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    shipper: Schema.Attribute.Relation<'manyToOne', 'api::shipper.shipper'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiShipperShipper extends Struct.CollectionTypeSchema {
  collectionName: 'shippers';
  info: {
    description: 'Ecommerce merchant shippers associated with tenants';
    displayName: 'Shipper';
    pluralName: 'shippers';
    singularName: 'shipper';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    account_id: Schema.Attribute.String & Schema.Attribute.Unique;
    api_key: Schema.Attribute.String & Schema.Attribute.Unique;
    business_type: Schema.Attribute.String;
    couriers: Schema.Attribute.Relation<'manyToMany', 'api::courier.courier'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::shipper.shipper'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    shipper_plan: Schema.Attribute.Relation<
      'manyToOne',
      'api::shipper-plan.shipper-plan'
    >;
    status: Schema.Attribute.String & Schema.Attribute.DefaultTo<'active'>;
    tenant: Schema.Attribute.Relation<'manyToOne', 'api::tenant.tenant'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    webhook_url: Schema.Attribute.String;
  };
}

export interface ApiTenantPlanTenantPlan extends Struct.CollectionTypeSchema {
  collectionName: 'tenant_plans';
  info: {
    description: 'SaaS subscription and tier plans';
    displayName: 'Tenant Plan';
    pluralName: 'tenant-plans';
    singularName: 'tenant-plan';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    api_access: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    charge_type: Schema.Attribute.Enumeration<['percentage', 'fixed_rupees']> &
      Schema.Attribute.DefaultTo<'percentage'>;
    charge_value: Schema.Attribute.Decimal & Schema.Attribute.DefaultTo<2>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    features: Schema.Attribute.JSON;
    limits: Schema.Attribute.JSON;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::tenant-plan.tenant-plan'
    > &
      Schema.Attribute.Private;
    max_parcels_per_month: Schema.Attribute.Integer;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    support_level: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Standard'>;
    tenants: Schema.Attribute.Relation<'oneToMany', 'api::tenant.tenant'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiTenantTenant extends Struct.CollectionTypeSchema {
  collectionName: 'tenants';
  info: {
    description: 'Multi-tenant SaaS root entities';
    displayName: 'Tenant';
    pluralName: 'tenants';
    singularName: 'tenant';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    address: Schema.Attribute.Text;
    business_name: Schema.Attribute.String;
    commissionPct: Schema.Attribute.Decimal & Schema.Attribute.DefaultTo<2>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    default_regions: Schema.Attribute.Relation<
      'oneToMany',
      'api::region.region'
    >;
    domain: Schema.Attribute.String & Schema.Attribute.Unique;
    features: Schema.Attribute.JSON;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::tenant.tenant'
    > &
      Schema.Attribute.Private;
    logo: Schema.Attribute.Media<'images'>;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    parcels: Schema.Attribute.Relation<'oneToMany', 'api::parcel.parcel'>;
    plan: Schema.Attribute.String;
    platform_commission_pct: Schema.Attribute.Decimal &
      Schema.Attribute.DefaultTo<2>;
    publishedAt: Schema.Attribute.DateTime;
    riders: Schema.Attribute.Relation<'oneToMany', 'api::rider.rider'>;
    status: Schema.Attribute.Enumeration<['active', 'suspended', 'pending']> &
      Schema.Attribute.DefaultTo<'pending'>;
    tenant_plan: Schema.Attribute.Relation<
      'manyToOne',
      'api::tenant-plan.tenant-plan'
    >;
    theme_primary_color: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'#003ec7'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    users: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.user'
    >;
  };
}

export interface ApiTplPartnerTplPartner extends Struct.CollectionTypeSchema {
  collectionName: 'tpl_partners';
  info: {
    description: 'Third-party logistics API integrations (e.g. Leopards, TCS)';
    displayName: 'TPL Partner';
    pluralName: 'tpl-partners';
    singularName: 'tpl-partner';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    api_credentials: Schema.Attribute.JSON;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::tpl-partner.tpl-partner'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    status: Schema.Attribute.String & Schema.Attribute.DefaultTo<'active'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiTplRateCardTplRateCard extends Struct.CollectionTypeSchema {
  collectionName: 'tpl_rate_cards';
  info: {
    description: 'Pricing rate cards for third-party logistics partners';
    displayName: 'TPL Rate Card';
    pluralName: 'tpl-rate-cards';
    singularName: 'tpl-rate-card';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    destination_region: Schema.Attribute.Relation<
      'manyToOne',
      'api::region.region'
    >;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::tpl-rate-card.tpl-rate-card'
    > &
      Schema.Attribute.Private;
    origin_region: Schema.Attribute.Relation<'manyToOne', 'api::region.region'>;
    partner: Schema.Attribute.Relation<
      'manyToOne',
      'api::tpl-partner.tpl-partner'
    >;
    price: Schema.Attribute.Decimal & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiTplStatusMappingTplStatusMapping
  extends Struct.CollectionTypeSchema {
  collectionName: 'tpl_status_mappings';
  info: {
    description: 'Maps external 3PL status codes to internal parcel statuses';
    displayName: 'TPL Status Mapping';
    pluralName: 'tpl-status-mappings';
    singularName: 'tpl-status-mapping';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    external_status_code: Schema.Attribute.String & Schema.Attribute.Required;
    internal_status: Schema.Attribute.Enumeration<
      [
        'Total Booking',
        'Not Arrived',
        'Arrived',
        'Arrived At Destination',
        'Out For delivery',
        'Delivered',
        'Failed Attempt',
        'Ready To Return',
        'Return Dispatched',
        'Return to Shipper',
      ]
    > &
      Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::tpl-status-mapping.tpl-status-mapping'
    > &
      Schema.Attribute.Private;
    partner: Schema.Attribute.Relation<
      'manyToOne',
      'api::tpl-partner.tpl-partner'
    >;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiWalletTransactionWalletTransaction
  extends Struct.CollectionTypeSchema {
  collectionName: 'wallet_transactions';
  info: {
    description: 'Financial ledger records';
    displayName: 'Wallet Transaction';
    pluralName: 'wallet-transactions';
    singularName: 'wallet-transaction';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    amount: Schema.Attribute.Decimal & Schema.Attribute.Required;
    category: Schema.Attribute.Enumeration<
      ['cod_collection', 'delivery_fee', 'commission', 'withdrawal', 'gst']
    > &
      Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::wallet-transaction.wallet-transaction'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    status: Schema.Attribute.Enumeration<
      ['pending', 'completed', 'cancelled']
    > &
      Schema.Attribute.DefaultTo<'pending'>;
    tenant: Schema.Attribute.Relation<'manyToOne', 'api::tenant.tenant'>;
    type: Schema.Attribute.Enumeration<['credit', 'debit']> &
      Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    user: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    >;
  };
}

export interface PluginContentReleasesRelease
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_releases';
  info: {
    displayName: 'Release';
    pluralName: 'releases';
    singularName: 'release';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    actions: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::content-releases.release-action'
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::content-releases.release'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    releasedAt: Schema.Attribute.DateTime;
    scheduledAt: Schema.Attribute.DateTime;
    status: Schema.Attribute.Enumeration<
      ['ready', 'blocked', 'failed', 'done', 'empty']
    > &
      Schema.Attribute.Required;
    timezone: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginContentReleasesReleaseAction
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_release_actions';
  info: {
    displayName: 'Release Action';
    pluralName: 'release-actions';
    singularName: 'release-action';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    contentType: Schema.Attribute.String & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    entryDocumentId: Schema.Attribute.String;
    isEntryValid: Schema.Attribute.Boolean;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::content-releases.release-action'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    release: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::content-releases.release'
    >;
    type: Schema.Attribute.Enumeration<['publish', 'unpublish']> &
      Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginI18NLocale extends Struct.CollectionTypeSchema {
  collectionName: 'i18n_locale';
  info: {
    collectionName: 'locales';
    description: '';
    displayName: 'Locale';
    pluralName: 'locales';
    singularName: 'locale';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    code: Schema.Attribute.String & Schema.Attribute.Unique;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::i18n.locale'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.SetMinMax<
        {
          max: 50;
          min: 1;
        },
        number
      >;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginReviewWorkflowsWorkflow
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_workflows';
  info: {
    description: '';
    displayName: 'Workflow';
    name: 'Workflow';
    pluralName: 'workflows';
    singularName: 'workflow';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    contentTypes: Schema.Attribute.JSON &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'[]'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::review-workflows.workflow'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    publishedAt: Schema.Attribute.DateTime;
    stageRequiredToPublish: Schema.Attribute.Relation<
      'oneToOne',
      'plugin::review-workflows.workflow-stage'
    >;
    stages: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::review-workflows.workflow-stage'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginReviewWorkflowsWorkflowStage
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_workflows_stages';
  info: {
    description: '';
    displayName: 'Stages';
    name: 'Workflow Stage';
    pluralName: 'workflow-stages';
    singularName: 'workflow-stage';
  };
  options: {
    draftAndPublish: false;
    version: '1.1.0';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    color: Schema.Attribute.String & Schema.Attribute.DefaultTo<'#4945FF'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::review-workflows.workflow-stage'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String;
    permissions: Schema.Attribute.Relation<'manyToMany', 'admin::permission'>;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    workflow: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::review-workflows.workflow'
    >;
  };
}

export interface PluginUploadFile extends Struct.CollectionTypeSchema {
  collectionName: 'files';
  info: {
    description: '';
    displayName: 'File';
    pluralName: 'files';
    singularName: 'file';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    alternativeText: Schema.Attribute.Text;
    caption: Schema.Attribute.Text;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    ext: Schema.Attribute.String;
    focalPoint: Schema.Attribute.JSON;
    folder: Schema.Attribute.Relation<'manyToOne', 'plugin::upload.folder'> &
      Schema.Attribute.Private;
    folderPath: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    formats: Schema.Attribute.JSON;
    hash: Schema.Attribute.String & Schema.Attribute.Required;
    height: Schema.Attribute.Integer;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::upload.file'
    > &
      Schema.Attribute.Private;
    mime: Schema.Attribute.String & Schema.Attribute.Required;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    previewUrl: Schema.Attribute.Text;
    provider: Schema.Attribute.String & Schema.Attribute.Required;
    provider_metadata: Schema.Attribute.JSON;
    publishedAt: Schema.Attribute.DateTime;
    related: Schema.Attribute.Relation<'morphToMany'>;
    size: Schema.Attribute.Decimal & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    url: Schema.Attribute.Text & Schema.Attribute.Required;
    width: Schema.Attribute.Integer;
  };
}

export interface PluginUploadFolder extends Struct.CollectionTypeSchema {
  collectionName: 'upload_folders';
  info: {
    displayName: 'Folder';
    pluralName: 'folders';
    singularName: 'folder';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    children: Schema.Attribute.Relation<'oneToMany', 'plugin::upload.folder'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    files: Schema.Attribute.Relation<'oneToMany', 'plugin::upload.file'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::upload.folder'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    parent: Schema.Attribute.Relation<'manyToOne', 'plugin::upload.folder'>;
    path: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    pathId: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginUsersPermissionsPermission
  extends Struct.CollectionTypeSchema {
  collectionName: 'up_permissions';
  info: {
    description: '';
    displayName: 'Permission';
    name: 'permission';
    pluralName: 'permissions';
    singularName: 'permission';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.permission'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    role: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.role'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginUsersPermissionsRole
  extends Struct.CollectionTypeSchema {
  collectionName: 'up_roles';
  info: {
    description: '';
    displayName: 'Role';
    name: 'role';
    pluralName: 'roles';
    singularName: 'role';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.role'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 3;
      }>;
    permissions: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.permission'
    >;
    publishedAt: Schema.Attribute.DateTime;
    type: Schema.Attribute.String & Schema.Attribute.Unique;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    users: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.user'
    >;
  };
}

export interface PluginUsersPermissionsUser
  extends Struct.CollectionTypeSchema {
  collectionName: 'up_users';
  info: {
    description: '';
    displayName: 'User';
    name: 'user';
    pluralName: 'users';
    singularName: 'user';
  };
  options: {
    draftAndPublish: false;
    timestamps: true;
  };
  attributes: {
    blocked: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    businessName: Schema.Attribute.String;
    confirmationToken: Schema.Attribute.String & Schema.Attribute.Private;
    confirmed: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    courier: Schema.Attribute.Relation<'manyToOne', 'api::courier.courier'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    email: Schema.Attribute.Email &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    fullName: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.user'
    > &
      Schema.Attribute.Private;
    offices: Schema.Attribute.Relation<'manyToMany', 'api::office.office'>;
    password: Schema.Attribute.Password &
      Schema.Attribute.Private &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    phone: Schema.Attribute.String;
    pickup_locations: Schema.Attribute.Relation<
      'manyToMany',
      'api::pickup-location.pickup-location'
    >;
    provider: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    resetPasswordToken: Schema.Attribute.String & Schema.Attribute.Private;
    role: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.role'
    >;
    role_definition: Schema.Attribute.Relation<
      'manyToMany',
      'api::role-definition.role-definition'
    >;
    shipper: Schema.Attribute.Relation<'manyToMany', 'api::shipper.shipper'>;
    shipper_roles: Schema.Attribute.JSON;
    tenant: Schema.Attribute.Relation<'manyToOne', 'api::tenant.tenant'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    username: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 3;
      }>;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ContentTypeSchemas {
      'admin::api-token': AdminApiToken;
      'admin::api-token-permission': AdminApiTokenPermission;
      'admin::permission': AdminPermission;
      'admin::role': AdminRole;
      'admin::session': AdminSession;
      'admin::transfer-token': AdminTransferToken;
      'admin::transfer-token-permission': AdminTransferTokenPermission;
      'admin::user': AdminUser;
      'api::about.about': ApiAboutAbout;
      'api::arrival.arrival': ApiArrivalArrival;
      'api::article.article': ApiArticleArticle;
      'api::author.author': ApiAuthorAuthor;
      'api::bag.bag': ApiBagBag;
      'api::category.category': ApiCategoryCategory;
      'api::city.city': ApiCityCity;
      'api::cod-settlement.cod-settlement': ApiCodSettlementCodSettlement;
      'api::courier-city.courier-city': ApiCourierCityCourierCity;
      'api::courier.courier': ApiCourierCourier;
      'api::delivery-attempt.delivery-attempt': ApiDeliveryAttemptDeliveryAttempt;
      'api::delivery-sheet.delivery-sheet': ApiDeliverySheetDeliverySheet;
      'api::dispute.dispute': ApiDisputeDispute;
      'api::event-stream.event-stream': ApiEventStreamEventStream;
      'api::global.global': ApiGlobalGlobal;
      'api::hub.hub': ApiHubHub;
      'api::invoice.invoice': ApiInvoiceInvoice;
      'api::load-sheet.load-sheet': ApiLoadSheetLoadSheet;
      'api::office.office': ApiOfficeOffice;
      'api::parcel-hub-movement.parcel-hub-movement': ApiParcelHubMovementParcelHubMovement;
      'api::parcel.parcel': ApiParcelParcel;
      'api::pickup-location.pickup-location': ApiPickupLocationPickupLocation;
      'api::pickup-request.pickup-request': ApiPickupRequestPickupRequest;
      'api::platform-integration.platform-integration': ApiPlatformIntegrationPlatformIntegration;
      'api::rating.rating': ApiRatingRating;
      'api::region-coverage-rule.region-coverage-rule': ApiRegionCoverageRuleRegionCoverageRule;
      'api::region.region': ApiRegionRegion;
      'api::replacement.replacement': ApiReplacementReplacement;
      'api::rider-assignment.rider-assignment': ApiRiderAssignmentRiderAssignment;
      'api::rider-location-history.rider-location-history': ApiRiderLocationHistoryRiderLocationHistory;
      'api::rider.rider': ApiRiderRider;
      'api::role-definition.role-definition': ApiRoleDefinitionRoleDefinition;
      'api::shipper-plan.shipper-plan': ApiShipperPlanShipperPlan;
      'api::shipper-wallet.shipper-wallet': ApiShipperWalletShipperWallet;
      'api::shipper.shipper': ApiShipperShipper;
      'api::tenant-plan.tenant-plan': ApiTenantPlanTenantPlan;
      'api::tenant.tenant': ApiTenantTenant;
      'api::tpl-partner.tpl-partner': ApiTplPartnerTplPartner;
      'api::tpl-rate-card.tpl-rate-card': ApiTplRateCardTplRateCard;
      'api::tpl-status-mapping.tpl-status-mapping': ApiTplStatusMappingTplStatusMapping;
      'api::wallet-transaction.wallet-transaction': ApiWalletTransactionWalletTransaction;
      'plugin::content-releases.release': PluginContentReleasesRelease;
      'plugin::content-releases.release-action': PluginContentReleasesReleaseAction;
      'plugin::i18n.locale': PluginI18NLocale;
      'plugin::review-workflows.workflow': PluginReviewWorkflowsWorkflow;
      'plugin::review-workflows.workflow-stage': PluginReviewWorkflowsWorkflowStage;
      'plugin::upload.file': PluginUploadFile;
      'plugin::upload.folder': PluginUploadFolder;
      'plugin::users-permissions.permission': PluginUsersPermissionsPermission;
      'plugin::users-permissions.role': PluginUsersPermissionsRole;
      'plugin::users-permissions.user': PluginUsersPermissionsUser;
    }
  }
}

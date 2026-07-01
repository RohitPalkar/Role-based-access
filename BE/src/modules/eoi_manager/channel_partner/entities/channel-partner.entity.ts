import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { EoiCampaign } from 'src/entities';
import { ChannelPartnerStatusEnum } from 'src/enums/eoi-form.enums';

@Entity('channel_partners')
export class ChannelPartner {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'cp_name', length: 255 })
  cpName: string;

  @Column({ length: 255, nullable: true })
  name: string;

  @Column({ length: 100, nullable: true })
  email: string;

  @Column({ name: 'contact_number', nullable: true })
  contactNumber: string;

  @Column({ name: 'country_code', nullable: true })
  countryCode: string;

  @Column({ length: 50, default: ChannelPartnerStatusEnum.NEW_REGISTRATION })
  status: ChannelPartnerStatusEnum;

  @Column({ nullable: true })
  rera: string;

  @Column({ nullable: true })
  gst: string;

  @Column({ nullable: true })
  region: string;

  @Column({ name: 'pan_number', length: 10, nullable: true })
  panNumber: string;

  @Column({ name: 'sfdc_cp_id', length: 50, nullable: true })
  sfdcCPId: string;

  @Column({ name: 'cp_type', length: 50, nullable: true })
  cpType: string;

  @Column({ name: 'campaign_id', nullable: true })
  campaignId: number;

  @ManyToOne(() => EoiCampaign, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'campaign_id' })
  campaign: EoiCampaign;

  @Column({ name: 'link_id' })
  linkId: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  city: string;

  @Column({ name: 'unit', nullable: true })
  unit?: string;

  @Column({ name: 'country', nullable: true })
  country?: string;

  @Column({ name: 'state', nullable: true })
  state?: string;

  @Column({ name: 'pin_code', nullable: true })
  pinCode: string;

  @Column({ name: 'created_by', nullable: true })
  createdBy: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}

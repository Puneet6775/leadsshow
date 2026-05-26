import { NextRequest } from 'next/server';
import ExcelJS from 'exceljs';
import { db } from '@/lib/db';

const RESULTS_PER_PAGE = 500; // More results per page for Excel export

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get('city') || undefined;
  const category = searchParams.get('category') || undefined;
  const page = parseInt(searchParams.get('page') || '1', 10);

  try {
    // Get total count first
    const totalCount = await db.lead.count({
      where: {
        ...(city ? { city } : {}),
        ...(category ? { primaryCategory: category } : {}),
      },
    });

    // Get paginated results
    const skip = (page - 1) * RESULTS_PER_PAGE;
    const leads = await db.lead.findMany({
      where: {
        ...(city ? { city } : {}),
        ...(category ? { primaryCategory: category } : {}),
      },
      orderBy: [{ leadScore: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: RESULTS_PER_PAGE,
    });

    if (leads.length === 0) {
      return new Response('No data found for this page', { status: 404 });
    }

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Leads');

    // Define columns
    sheet.columns = [
      { header: 'Business Name', key: 'businessName', width: 30 },
      { header: 'Category', key: 'primaryCategory', width: 20 },
      { header: 'Phone', key: 'phonePrimary', width: 20 },
      { header: 'Website', key: 'websiteUrl', width: 28 },
      { header: 'Address', key: 'addressLine1', width: 40 },
      { header: 'City', key: 'city', width: 18 },
      { header: 'State', key: 'state', width: 18 },
      { header: 'Postal Code', key: 'postalCode', width: 14 },
      { header: 'Country', key: 'country', width: 14 },
      { header: 'Google Maps URL', key: 'googleMapsUrl', width: 32 },
      { header: 'Rating', key: 'rating', width: 10 },
      { header: 'Review Count', key: 'reviewCount', width: 14 },
      { header: 'Latitude', key: 'latitude', width: 14 },
      { header: 'Longitude', key: 'longitude', width: 14 },
      { header: 'Lead Score', key: 'leadScore', width: 12 },
      { header: 'Business Status', key: 'businessStatus', width: 18 },
    ];

    // Add rows with proper formatting
    leads.forEach((lead: any) => {
      sheet.addRow({
        businessName: lead.businessName || '',
        primaryCategory: lead.primaryCategory || '',
        phonePrimary: lead.phonePrimary || '',
        websiteUrl: lead.websiteUrl || '',
        addressLine1: lead.addressLine1 || '',
        city: lead.city || '',
        state: lead.state || '',
        postalCode: lead.postalCode || '',
        country: lead.country || '',
        googleMapsUrl: lead.googleMapsUrl || '',
        rating: lead.rating || '',
        reviewCount: lead.reviewCount || '',
        latitude: lead.latitude || '',
        longitude: lead.longitude || '',
        leadScore: lead.leadScore || '',
        businessStatus: lead.businessStatus || '',
      });
    });

    // Style header row
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF366092' },
    };

    // Generate filename with pagination info
    const fileName = `leads-${city || 'all'}-page${page}-${Date.now()}.xlsx`;

    // Record export
    await db.exportFile.create({
      data: {
        fileName,
        format: 'XLSX',
        rowCount: leads.length,
        filtersJson: { city, category, page, totalCount },
      },
    });

    // Write to buffer
    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer as any, {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'X-Page-Info': JSON.stringify({
          page,
          pageSize: RESULTS_PER_PAGE,
          total: totalCount,
          totalPages: Math.ceil(totalCount / RESULTS_PER_PAGE),
          rowsInThisFile: leads.length,
        }),
      },
    });
  } catch (error) {
    console.error('XLSX export error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to generate Excel file',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}